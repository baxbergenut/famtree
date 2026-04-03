package tree

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
)

var (
	ErrTreeNotFound       = errors.New("tree not found")
	ErrPersonNotFound     = errors.New("person not found")
	ErrInvalidRelation    = errors.New("invalid relation")
	ErrInvalidPersonInput = errors.New("invalid person input")
	ErrParentLimitReached = errors.New("child already has two parents")
)

type Service struct {
	db *sql.DB
}

type RootPerson struct {
	ID        string  `json:"id"`
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	Note      *string `json:"note,omitempty"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
}

type TreeSummary struct {
	ID          string     `json:"id"`
	OwnerUserID string     `json:"ownerUserId"`
	RootPerson  RootPerson `json:"rootPerson"`
}

type Person struct {
	ID        string  `json:"id"`
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	Note      *string `json:"note,omitempty"`
	BirthDate *string `json:"birthDate,omitempty"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	IsRoot    bool    `json:"isRoot"`
}

type FamilyUnit struct {
	ID              string   `json:"id"`
	ParentPersonIDs []string `json:"parentPersonIds"`
	ChildPersonIDs  []string `json:"childPersonIds"`
}

type Graph struct {
	TreeID       string       `json:"treeId"`
	RootPersonID string       `json:"rootPersonId"`
	Persons      []Person     `json:"persons"`
	FamilyUnits  []FamilyUnit `json:"familyUnits"`
}

type CreateRelativeInput struct {
	AnchorPersonID string
	Relation       string
	FirstName      string
	LastName       string
	Note           *string
	BirthDate      *string
}

type UpdatePositionInput struct {
	PersonID string
	X        float64
	Y        float64
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetByOwnerUserID(ctx context.Context, ownerUserID string) (TreeSummary, error) {
	var result TreeSummary
	var note sql.NullString

	err := s.db.QueryRowContext(ctx, `
		SELECT
			t.id,
			t.owner_user_id,
			p.id,
			p.first_name,
			p.last_name,
			p.note,
			p.x,
			p.y
		FROM trees t
		JOIN persons p ON p.id = t.root_person_id
		WHERE t.owner_user_id = $1
	`, ownerUserID).Scan(
		&result.ID,
		&result.OwnerUserID,
		&result.RootPerson.ID,
		&result.RootPerson.FirstName,
		&result.RootPerson.LastName,
		&note,
		&result.RootPerson.X,
		&result.RootPerson.Y,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return TreeSummary{}, ErrTreeNotFound
		}
		return TreeSummary{}, err
	}

	if note.Valid {
		result.RootPerson.Note = &note.String
	}

	return result, nil
}

func (s *Service) GetGraphByOwnerUserID(ctx context.Context, ownerUserID string) (Graph, error) {
	if err := s.backfillLegacyRelationships(ctx, ownerUserID); err != nil {
		return Graph{}, err
	}

	graph := Graph{
		Persons:     []Person{},
		FamilyUnits: []FamilyUnit{},
	}

	err := s.db.QueryRowContext(ctx, `
		SELECT id, root_person_id
		FROM trees
		WHERE owner_user_id = $1
	`, ownerUserID).Scan(&graph.TreeID, &graph.RootPersonID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Graph{}, ErrTreeNotFound
		}
		return Graph{}, err
	}

	personRows, err := s.db.QueryContext(ctx, `
		SELECT
			p.id,
			p.first_name,
			p.last_name,
			p.note,
			p.birth_date::text,
			p.x,
			p.y,
			p.id = t.root_person_id AS is_root
		FROM persons p
		JOIN trees t ON t.id = p.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY p.created_at ASC
	`, ownerUserID)
	if err != nil {
		return Graph{}, err
	}
	defer personRows.Close()

	for personRows.Next() {
		var person Person
		var note sql.NullString
		var birthDate sql.NullString

		if err := personRows.Scan(
			&person.ID,
			&person.FirstName,
			&person.LastName,
			&note,
			&birthDate,
			&person.X,
			&person.Y,
			&person.IsRoot,
		); err != nil {
			return Graph{}, err
		}

		if note.Valid {
			person.Note = &note.String
		}

		if birthDate.Valid {
			person.BirthDate = &birthDate.String
		}

		graph.Persons = append(graph.Persons, person)
	}

	if err := personRows.Err(); err != nil {
		return Graph{}, err
	}

	familyUnitRows, err := s.db.QueryContext(ctx, `
		SELECT fu.id
		FROM family_units fu
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY fu.created_at ASC
	`, ownerUserID)
	if err != nil {
		return Graph{}, err
	}
	defer familyUnitRows.Close()

	familyUnitIndexByID := map[string]int{}
	for familyUnitRows.Next() {
		var familyUnit FamilyUnit
		if err := familyUnitRows.Scan(&familyUnit.ID); err != nil {
			return Graph{}, err
		}

		familyUnit.ParentPersonIDs = []string{}
		familyUnit.ChildPersonIDs = []string{}
		familyUnitIndexByID[familyUnit.ID] = len(graph.FamilyUnits)
		graph.FamilyUnits = append(graph.FamilyUnits, familyUnit)
	}

	if err := familyUnitRows.Err(); err != nil {
		return Graph{}, err
	}

	familyParentRows, err := s.db.QueryContext(ctx, `
		SELECT fup.family_unit_id, fup.person_id
		FROM family_unit_parents fup
		JOIN family_units fu ON fu.id = fup.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY fup.created_at ASC
	`, ownerUserID)
	if err != nil {
		return Graph{}, err
	}
	defer familyParentRows.Close()

	for familyParentRows.Next() {
		var familyUnitID string
		var personID string
		if err := familyParentRows.Scan(&familyUnitID, &personID); err != nil {
			return Graph{}, err
		}

		if familyIndex, ok := familyUnitIndexByID[familyUnitID]; ok {
			graph.FamilyUnits[familyIndex].ParentPersonIDs = append(
				graph.FamilyUnits[familyIndex].ParentPersonIDs,
				personID,
			)
		}
	}

	if err := familyParentRows.Err(); err != nil {
		return Graph{}, err
	}

	familyChildRows, err := s.db.QueryContext(ctx, `
		SELECT fuc.family_unit_id, fuc.person_id
		FROM family_unit_children fuc
		JOIN family_units fu ON fu.id = fuc.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY fuc.created_at ASC
	`, ownerUserID)
	if err != nil {
		return Graph{}, err
	}
	defer familyChildRows.Close()

	for familyChildRows.Next() {
		var familyUnitID string
		var personID string
		if err := familyChildRows.Scan(&familyUnitID, &personID); err != nil {
			return Graph{}, err
		}

		if familyIndex, ok := familyUnitIndexByID[familyUnitID]; ok {
			graph.FamilyUnits[familyIndex].ChildPersonIDs = append(
				graph.FamilyUnits[familyIndex].ChildPersonIDs,
				personID,
			)
		}
	}

	if err := familyChildRows.Err(); err != nil {
		return Graph{}, err
	}

	return graph, nil
}

func (s *Service) CreateRelative(ctx context.Context, ownerUserID string, input CreateRelativeInput) (Graph, error) {
	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	if input.AnchorPersonID == "" || input.FirstName == "" {
		return Graph{}, ErrInvalidPersonInput
	}

	if input.Relation != "parent" && input.Relation != "child" {
		return Graph{}, ErrInvalidRelation
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Graph{}, err
	}
	defer tx.Rollback()

	var treeID string
	var anchorX float64
	var anchorY float64
	err = tx.QueryRowContext(ctx, `
		SELECT p.tree_id, p.x, p.y
		FROM persons p
		JOIN trees t ON t.id = p.tree_id
		WHERE p.id = $1
		  AND t.owner_user_id = $2
	`, input.AnchorPersonID, ownerUserID).Scan(&treeID, &anchorX, &anchorY)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Graph{}, ErrPersonNotFound
		}
		return Graph{}, err
	}

	switch input.Relation {
	case "parent":
		familyUnit, hasFamilyUnit, err := s.loadChildFamilyUnit(ctx, tx, ownerUserID, input.AnchorPersonID)
		if err != nil {
			return Graph{}, err
		}

		if hasFamilyUnit && len(familyUnit.ParentPersonIDs) >= 2 {
			return Graph{}, ErrParentLimitReached
		}

		offsetX, offsetY, err := s.calculateParentPlacement(
			ctx,
			tx,
			anchorX,
			anchorY,
			familyUnit,
			hasFamilyUnit,
		)
		if err != nil {
			return Graph{}, err
		}

		personID, err := s.insertPerson(
			ctx,
			tx,
			treeID,
			ownerUserID,
			input.FirstName,
			input.LastName,
			input.Note,
			input.BirthDate,
			offsetX,
			offsetY,
		)
		if err != nil {
			return Graph{}, err
		}

		if !hasFamilyUnit {
			familyUnit.ID, err = s.createFamilyUnit(ctx, tx, treeID, ownerUserID)
			if err != nil {
				return Graph{}, err
			}

			if err := s.attachChildToFamilyUnit(ctx, tx, familyUnit.ID, input.AnchorPersonID); err != nil {
				return Graph{}, err
			}
		}

		if err := s.attachParentToFamilyUnit(ctx, tx, familyUnit.ID, personID); err != nil {
			return Graph{}, err
		}
	case "child":
		familyUnit, hasFamilyUnit, err := s.loadParentFamilyUnit(ctx, tx, ownerUserID, input.AnchorPersonID)
		if err != nil {
			return Graph{}, err
		}

		if !hasFamilyUnit {
			familyUnit.ID, err = s.createFamilyUnit(ctx, tx, treeID, ownerUserID)
			if err != nil {
				return Graph{}, err
			}

			if err := s.attachParentToFamilyUnit(ctx, tx, familyUnit.ID, input.AnchorPersonID); err != nil {
				return Graph{}, err
			}
		}

		offsetX, offsetY, err := s.calculateChildPlacement(ctx, tx, familyUnit.ID, anchorX, anchorY)
		if err != nil {
			return Graph{}, err
		}

		personID, err := s.insertPerson(
			ctx,
			tx,
			treeID,
			ownerUserID,
			input.FirstName,
			input.LastName,
			input.Note,
			input.BirthDate,
			offsetX,
			offsetY,
		)
		if err != nil {
			return Graph{}, err
		}

		if err := s.attachChildToFamilyUnit(ctx, tx, familyUnit.ID, personID); err != nil {
			return Graph{}, err
		}
	default:
		return Graph{}, ErrInvalidRelation
	}

	if err := tx.Commit(); err != nil {
		return Graph{}, err
	}

	return s.GetGraphByOwnerUserID(ctx, ownerUserID)
}

func (s *Service) UpdatePosition(ctx context.Context, ownerUserID string, input UpdatePositionInput) error {
	if input.PersonID == "" {
		return ErrPersonNotFound
	}

	result, err := s.db.ExecContext(ctx, `
		UPDATE persons p
		SET x = $1, y = $2, updated_at = NOW()
		FROM trees t
		WHERE p.id = $3
		  AND p.tree_id = t.id
		  AND t.owner_user_id = $4
	`, input.X, input.Y, input.PersonID, ownerUserID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrPersonNotFound
	}

	return nil
}

func (s *Service) calculateParentPlacement(
	ctx context.Context,
	tx *sql.Tx,
	anchorX float64,
	anchorY float64,
	familyUnit FamilyUnit,
	hasFamilyUnit bool,
) (float64, float64, error) {
	if !hasFamilyUnit || len(familyUnit.ParentPersonIDs) == 0 {
		return anchorX, anchorY - 240, nil
	}

	if len(familyUnit.ParentPersonIDs) >= 2 {
		return 0, 0, ErrParentLimitReached
	}

	var existingParentX float64
	err := tx.QueryRowContext(ctx, `
		SELECT x
		FROM persons
		WHERE id = $1
	`, familyUnit.ParentPersonIDs[0]).Scan(&existingParentX)
	if err != nil {
		return 0, 0, err
	}

	candidateX := anchorX + (anchorX - existingParentX)
	if candidateX == existingParentX {
		candidateX = existingParentX + 220
	}

	return candidateX, anchorY - 240, nil
}

func (s *Service) calculateChildPlacement(
	ctx context.Context,
	tx *sql.Tx,
	familyUnitID string,
	anchorX float64,
	anchorY float64,
) (float64, float64, error) {
	parentRows, err := tx.QueryContext(ctx, `
		SELECT p.x, p.y
		FROM family_unit_parents fup
		JOIN persons p ON p.id = fup.person_id
		WHERE fup.family_unit_id = $1
		ORDER BY fup.created_at ASC
	`, familyUnitID)
	if err != nil {
		return 0, 0, err
	}
	defer parentRows.Close()

	parentCount := 0
	centerX := 0.0
	maxParentY := anchorY
	for parentRows.Next() {
		var parentX float64
		var parentY float64
		if err := parentRows.Scan(&parentX, &parentY); err != nil {
			return 0, 0, err
		}

		centerX += parentX
		if parentCount == 0 || parentY > maxParentY {
			maxParentY = parentY
		}
		parentCount++
	}

	if err := parentRows.Err(); err != nil {
		return 0, 0, err
	}

	if parentCount == 0 {
		centerX = anchorX
	} else {
		centerX = centerX / float64(parentCount)
	}

	var childCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM family_unit_children
		WHERE family_unit_id = $1
	`, familyUnitID).Scan(&childCount); err != nil {
		return 0, 0, err
	}

	return centerX + alternatingOffset(childCount), maxParentY + 240, nil
}

func alternatingOffset(index int) float64 {
	if index == 0 {
		return 0
	}

	step := float64((index+1)/2) * 220
	if index%2 == 1 {
		return -step
	}

	return step
}

func nullableString(value *string) any {
	if value == nil || *value == "" {
		return nil
	}

	return *value
}

func (s *Service) insertPerson(
	ctx context.Context,
	tx *sql.Tx,
	treeID string,
	ownerUserID string,
	firstName string,
	lastName string,
	note *string,
	birthDate *string,
	x float64,
	y float64,
) (string, error) {
	var personID string
	err := tx.QueryRowContext(ctx, `
		INSERT INTO persons (
			tree_id,
			first_name,
			last_name,
			note,
			birth_date,
			x,
			y,
			created_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, treeID, firstName, lastName, nullableString(note), nullableString(birthDate), x, y, ownerUserID).Scan(&personID)
	if err != nil {
		return "", err
	}

	return personID, nil
}

func (s *Service) createFamilyUnit(ctx context.Context, tx *sql.Tx, treeID string, ownerUserID string) (string, error) {
	var familyUnitID string
	err := tx.QueryRowContext(ctx, `
		INSERT INTO family_units (tree_id, created_by_user_id)
		VALUES ($1, $2)
		RETURNING id
	`, treeID, ownerUserID).Scan(&familyUnitID)
	if err != nil {
		return "", err
	}

	return familyUnitID, nil
}

func (s *Service) attachParentToFamilyUnit(ctx context.Context, tx *sql.Tx, familyUnitID string, personID string) error {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO family_unit_parents (family_unit_id, person_id)
		VALUES ($1, $2)
	`, familyUnitID, personID); err != nil {
		return err
	}

	return s.touchFamilyUnit(ctx, tx, familyUnitID)
}

func (s *Service) attachChildToFamilyUnit(ctx context.Context, tx *sql.Tx, familyUnitID string, personID string) error {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO family_unit_children (family_unit_id, person_id)
		VALUES ($1, $2)
	`, familyUnitID, personID); err != nil {
		return err
	}

	return s.touchFamilyUnit(ctx, tx, familyUnitID)
}

func (s *Service) touchFamilyUnit(ctx context.Context, tx *sql.Tx, familyUnitID string) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE family_units
		SET updated_at = NOW()
		WHERE id = $1
	`, familyUnitID)

	return err
}

func (s *Service) loadChildFamilyUnit(
	ctx context.Context,
	tx *sql.Tx,
	ownerUserID string,
	childPersonID string,
) (FamilyUnit, bool, error) {
	var familyUnitID string
	err := tx.QueryRowContext(ctx, `
		SELECT fuc.family_unit_id
		FROM family_unit_children fuc
		JOIN family_units fu ON fu.id = fuc.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE fuc.person_id = $1
		  AND t.owner_user_id = $2
		LIMIT 1
	`, childPersonID, ownerUserID).Scan(&familyUnitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return FamilyUnit{}, false, nil
		}
		return FamilyUnit{}, false, err
	}

	familyUnit, err := s.loadFamilyUnit(ctx, tx, familyUnitID)
	if err != nil {
		return FamilyUnit{}, false, err
	}

	return familyUnit, true, nil
}

func (s *Service) loadParentFamilyUnit(
	ctx context.Context,
	tx *sql.Tx,
	ownerUserID string,
	parentPersonID string,
) (FamilyUnit, bool, error) {
	var familyUnitID string
	err := tx.QueryRowContext(ctx, `
		SELECT fup.family_unit_id
		FROM family_unit_parents fup
		JOIN family_units fu ON fu.id = fup.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE fup.person_id = $1
		  AND t.owner_user_id = $2
		ORDER BY fu.updated_at DESC, fu.created_at DESC
		LIMIT 1
	`, parentPersonID, ownerUserID).Scan(&familyUnitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return FamilyUnit{}, false, nil
		}
		return FamilyUnit{}, false, err
	}

	familyUnit, err := s.loadFamilyUnit(ctx, tx, familyUnitID)
	if err != nil {
		return FamilyUnit{}, false, err
	}

	return familyUnit, true, nil
}

func (s *Service) loadFamilyUnit(ctx context.Context, tx *sql.Tx, familyUnitID string) (FamilyUnit, error) {
	familyUnit := FamilyUnit{
		ID:              familyUnitID,
		ParentPersonIDs: []string{},
		ChildPersonIDs:  []string{},
	}

	parentRows, err := tx.QueryContext(ctx, `
		SELECT person_id
		FROM family_unit_parents
		WHERE family_unit_id = $1
		ORDER BY created_at ASC
	`, familyUnitID)
	if err != nil {
		return FamilyUnit{}, err
	}
	defer parentRows.Close()

	for parentRows.Next() {
		var personID string
		if err := parentRows.Scan(&personID); err != nil {
			return FamilyUnit{}, err
		}

		familyUnit.ParentPersonIDs = append(familyUnit.ParentPersonIDs, personID)
	}

	if err := parentRows.Err(); err != nil {
		return FamilyUnit{}, err
	}

	childRows, err := tx.QueryContext(ctx, `
		SELECT person_id
		FROM family_unit_children
		WHERE family_unit_id = $1
		ORDER BY created_at ASC
	`, familyUnitID)
	if err != nil {
		return FamilyUnit{}, err
	}
	defer childRows.Close()

	for childRows.Next() {
		var personID string
		if err := childRows.Scan(&personID); err != nil {
			return FamilyUnit{}, err
		}

		familyUnit.ChildPersonIDs = append(familyUnit.ChildPersonIDs, personID)
	}

	if err := childRows.Err(); err != nil {
		return FamilyUnit{}, err
	}

	return familyUnit, nil
}

type legacyRelationshipRow struct {
	TreeID         string
	ParentPersonID string
	ChildPersonID  string
}

type legacyChildGroup struct {
	TreeID    string
	ParentIDs []string
	ChildIDs  []string
}

func (s *Service) backfillLegacyRelationships(ctx context.Context, ownerUserID string) error {
	var legacyTableName sql.NullString
	if err := s.db.QueryRowContext(ctx, `
		SELECT to_regclass('public.parent_child_relationships')::text
	`).Scan(&legacyTableName); err != nil {
		return err
	}

	if !legacyTableName.Valid {
		return nil
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT
			r.tree_id,
			r.parent_person_id,
			r.child_person_id
		FROM parent_child_relationships r
		JOIN trees t ON t.id = r.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY r.created_at ASC
	`, ownerUserID)
	if err != nil {
		return err
	}
	defer rows.Close()

	legacyRows := []legacyRelationshipRow{}
	for rows.Next() {
		var row legacyRelationshipRow
		if err := rows.Scan(&row.TreeID, &row.ParentPersonID, &row.ChildPersonID); err != nil {
			return err
		}

		legacyRows = append(legacyRows, row)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	if len(legacyRows) == 0 {
		return nil
	}

	migratedChildRows, err := s.db.QueryContext(ctx, `
		SELECT fuc.person_id
		FROM family_unit_children fuc
		JOIN family_units fu ON fu.id = fuc.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
	`, ownerUserID)
	if err != nil {
		return err
	}
	defer migratedChildRows.Close()

	migratedChildren := map[string]struct{}{}
	for migratedChildRows.Next() {
		var personID string
		if err := migratedChildRows.Scan(&personID); err != nil {
			return err
		}

		migratedChildren[personID] = struct{}{}
	}

	if err := migratedChildRows.Err(); err != nil {
		return err
	}

	childParents := map[string]map[string]struct{}{}
	childTree := map[string]string{}
	for _, row := range legacyRows {
		if _, alreadyMigrated := migratedChildren[row.ChildPersonID]; alreadyMigrated {
			continue
		}

		if _, ok := childParents[row.ChildPersonID]; !ok {
			childParents[row.ChildPersonID] = map[string]struct{}{}
			childTree[row.ChildPersonID] = row.TreeID
		}

		childParents[row.ChildPersonID][row.ParentPersonID] = struct{}{}
	}

	if len(childParents) == 0 {
		return nil
	}

	groupByKey := map[string]*legacyChildGroup{}
	for childID, parentSet := range childParents {
		parentIDs := make([]string, 0, len(parentSet))
		for parentID := range parentSet {
			parentIDs = append(parentIDs, parentID)
		}
		sort.Strings(parentIDs)

		key := childTree[childID] + "|" + strings.Join(parentIDs, ",")
		if _, ok := groupByKey[key]; !ok {
			groupByKey[key] = &legacyChildGroup{
				TreeID:    childTree[childID],
				ParentIDs: append([]string(nil), parentIDs...),
				ChildIDs:  []string{},
			}
		}

		groupByKey[key].ChildIDs = append(groupByKey[key].ChildIDs, childID)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, group := range groupByKey {
		familyUnitID, err := s.createFamilyUnit(ctx, tx, group.TreeID, ownerUserID)
		if err != nil {
			return err
		}

		for _, parentID := range group.ParentIDs {
			if err := s.attachParentToFamilyUnit(ctx, tx, familyUnitID, parentID); err != nil {
				return err
			}
		}

		sort.Strings(group.ChildIDs)
		for _, childID := range group.ChildIDs {
			if err := s.attachChildToFamilyUnit(ctx, tx, familyUnitID, childID); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}
