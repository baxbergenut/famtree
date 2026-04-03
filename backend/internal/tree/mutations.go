package tree

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

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
		union, hasUnion, err := s.loadChildUnion(ctx, tx, ownerUserID, input.AnchorPersonID)
		if err != nil {
			return Graph{}, err
		}

		if hasUnion && len(union.ParentIDs) >= 2 {
			return Graph{}, ErrParentLimitReached
		}

		x, y, err := s.calculateParentPlacement(ctx, tx, anchorX, anchorY, union, hasUnion)
		if err != nil {
			return Graph{}, err
		}

		personID, err := s.insertPerson(ctx, tx, treeID, ownerUserID, input.FirstName, input.LastName, input.Note, input.BirthDate, x, y)
		if err != nil {
			return Graph{}, err
		}

		if !hasUnion {
			union.ID, err = s.createUnion(ctx, tx, treeID, ownerUserID)
			if err != nil {
				return Graph{}, err
			}

			if err := s.attachChildToUnion(ctx, tx, union.ID, input.AnchorPersonID); err != nil {
				return Graph{}, err
			}
		}

		if err := s.attachParentToUnion(ctx, tx, union.ID, personID); err != nil {
			return Graph{}, err
		}
	case "child":
		union, hasUnion, err := s.loadParentUnion(ctx, tx, ownerUserID, input.AnchorPersonID)
		if err != nil {
			return Graph{}, err
		}

		if !hasUnion {
			union.ID, err = s.createUnion(ctx, tx, treeID, ownerUserID)
			if err != nil {
				return Graph{}, err
			}

			if err := s.attachParentToUnion(ctx, tx, union.ID, input.AnchorPersonID); err != nil {
				return Graph{}, err
			}
		}

		x, y, err := s.calculateChildPlacement(ctx, tx, union.ID, anchorX, anchorY)
		if err != nil {
			return Graph{}, err
		}

		personID, err := s.insertPerson(ctx, tx, treeID, ownerUserID, input.FirstName, input.LastName, input.Note, input.BirthDate, x, y)
		if err != nil {
			return Graph{}, err
		}

		if err := s.attachChildToUnion(ctx, tx, union.ID, personID); err != nil {
			return Graph{}, err
		}
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
	union Union,
	hasUnion bool,
) (float64, float64, error) {
	if !hasUnion || len(union.ParentIDs) == 0 {
		return anchorX, anchorY - 240, nil
	}

	if len(union.ParentIDs) >= 2 {
		return 0, 0, ErrParentLimitReached
	}

	var existingParentX float64
	err := tx.QueryRowContext(ctx, `
		SELECT x
		FROM persons
		WHERE id = $1
	`, union.ParentIDs[0]).Scan(&existingParentX)
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
	unionID string,
	anchorX float64,
	anchorY float64,
) (float64, float64, error) {
	parentRows, err := tx.QueryContext(ctx, `
		SELECT p.x, p.y
		FROM family_unit_parents fup
		JOIN persons p ON p.id = fup.person_id
		WHERE fup.family_unit_id = $1
		ORDER BY fup.created_at ASC
	`, unionID)
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
		centerX /= float64(parentCount)
	}

	var childCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM family_unit_children
		WHERE family_unit_id = $1
	`, unionID).Scan(&childCount); err != nil {
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

func (s *Service) createUnion(ctx context.Context, tx *sql.Tx, treeID string, ownerUserID string) (string, error) {
	var unionID string
	err := tx.QueryRowContext(ctx, `
		INSERT INTO family_units (tree_id, created_by_user_id)
		VALUES ($1, $2)
		RETURNING id
	`, treeID, ownerUserID).Scan(&unionID)
	if err != nil {
		return "", err
	}

	return unionID, nil
}

func (s *Service) attachParentToUnion(ctx context.Context, tx *sql.Tx, unionID string, personID string) error {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO family_unit_parents (family_unit_id, person_id)
		VALUES ($1, $2)
	`, unionID, personID); err != nil {
		return err
	}

	return s.touchUnion(ctx, tx, unionID)
}

func (s *Service) attachChildToUnion(ctx context.Context, tx *sql.Tx, unionID string, personID string) error {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO family_unit_children (family_unit_id, person_id)
		VALUES ($1, $2)
	`, unionID, personID); err != nil {
		return err
	}

	return s.touchUnion(ctx, tx, unionID)
}

func (s *Service) touchUnion(ctx context.Context, tx *sql.Tx, unionID string) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE family_units
		SET updated_at = NOW()
		WHERE id = $1
	`, unionID)

	return err
}

func (s *Service) loadChildUnion(
	ctx context.Context,
	tx *sql.Tx,
	ownerUserID string,
	childPersonID string,
) (Union, bool, error) {
	var unionID string
	err := tx.QueryRowContext(ctx, `
		SELECT fuc.family_unit_id
		FROM family_unit_children fuc
		JOIN family_units fu ON fu.id = fuc.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE fuc.person_id = $1
		  AND t.owner_user_id = $2
		LIMIT 1
	`, childPersonID, ownerUserID).Scan(&unionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Union{}, false, nil
		}
		return Union{}, false, err
	}

	union, err := s.loadUnion(ctx, tx, unionID)
	if err != nil {
		return Union{}, false, err
	}

	return union, true, nil
}

func (s *Service) loadParentUnion(
	ctx context.Context,
	tx *sql.Tx,
	ownerUserID string,
	parentPersonID string,
) (Union, bool, error) {
	var unionID string
	err := tx.QueryRowContext(ctx, `
		SELECT fup.family_unit_id
		FROM family_unit_parents fup
		JOIN family_units fu ON fu.id = fup.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE fup.person_id = $1
		  AND t.owner_user_id = $2
		ORDER BY fu.updated_at DESC, fu.created_at DESC
		LIMIT 1
	`, parentPersonID, ownerUserID).Scan(&unionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Union{}, false, nil
		}
		return Union{}, false, err
	}

	union, err := s.loadUnion(ctx, tx, unionID)
	if err != nil {
		return Union{}, false, err
	}

	return union, true, nil
}

func (s *Service) loadUnion(ctx context.Context, tx *sql.Tx, unionID string) (Union, error) {
	union := Union{
		ID:        unionID,
		ParentIDs: []string{},
		ChildIDs:  []string{},
	}

	parentRows, err := tx.QueryContext(ctx, `
		SELECT person_id
		FROM family_unit_parents
		WHERE family_unit_id = $1
		ORDER BY created_at ASC
	`, unionID)
	if err != nil {
		return Union{}, err
	}
	defer parentRows.Close()

	for parentRows.Next() {
		var personID string
		if err := parentRows.Scan(&personID); err != nil {
			return Union{}, err
		}

		union.ParentIDs = append(union.ParentIDs, personID)
	}

	if err := parentRows.Err(); err != nil {
		return Union{}, err
	}

	childRows, err := tx.QueryContext(ctx, `
		SELECT person_id
		FROM family_unit_children
		WHERE family_unit_id = $1
		ORDER BY created_at ASC
	`, unionID)
	if err != nil {
		return Union{}, err
	}
	defer childRows.Close()

	for childRows.Next() {
		var personID string
		if err := childRows.Scan(&personID); err != nil {
			return Union{}, err
		}

		union.ChildIDs = append(union.ChildIDs, personID)
	}

	if err := childRows.Err(); err != nil {
		return Union{}, err
	}

	return union, nil
}
