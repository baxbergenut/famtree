package tree

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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

type Relationship struct {
	ID             string `json:"id"`
	ParentPersonID string `json:"parentPersonId"`
	ChildPersonID  string `json:"childPersonId"`
}

type Graph struct {
	TreeID        string         `json:"treeId"`
	RootPersonID  string         `json:"rootPersonId"`
	Persons       []Person       `json:"persons"`
	Relationships []Relationship `json:"relationships"`
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
	graph := Graph{
		Persons:       []Person{},
		Relationships: []Relationship{},
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

	relationshipRows, err := s.db.QueryContext(ctx, `
		SELECT
			r.id,
			r.parent_person_id,
			r.child_person_id
		FROM parent_child_relationships r
		JOIN trees t ON t.id = r.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY r.created_at ASC
	`, ownerUserID)
	if err != nil {
		return Graph{}, err
	}
	defer relationshipRows.Close()

	for relationshipRows.Next() {
		var relationship Relationship
		if err := relationshipRows.Scan(
			&relationship.ID,
			&relationship.ParentPersonID,
			&relationship.ChildPersonID,
		); err != nil {
			return Graph{}, err
		}

		graph.Relationships = append(graph.Relationships, relationship)
	}

	return graph, relationshipRows.Err()
}

func (s *Service) CreateRelative(ctx context.Context, ownerUserID string, input CreateRelativeInput) (Graph, error) {
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

	offsetX, offsetY, err := s.calculatePlacement(ctx, tx, input.Relation, input.AnchorPersonID, anchorX, anchorY)
	if err != nil {
		return Graph{}, err
	}

	var personID string
	err = tx.QueryRowContext(ctx, `
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
	`, treeID, input.FirstName, input.LastName, nullableString(input.Note), nullableString(input.BirthDate), offsetX, offsetY, ownerUserID).Scan(&personID)
	if err != nil {
		return Graph{}, err
	}

	parentID := personID
	childID := input.AnchorPersonID
	if input.Relation == "child" {
		parentID = input.AnchorPersonID
		childID = personID
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO parent_child_relationships (tree_id, parent_person_id, child_person_id)
		VALUES ($1, $2, $3)
	`, treeID, parentID, childID); err != nil {
		return Graph{}, err
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

func (s *Service) calculatePlacement(
	ctx context.Context,
	tx *sql.Tx,
	relation string,
	anchorPersonID string,
	anchorX float64,
	anchorY float64,
) (float64, float64, error) {
	switch relation {
	case "parent":
		var parentCount int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM parent_child_relationships
			WHERE child_person_id = $1
		`, anchorPersonID).Scan(&parentCount); err != nil {
			return 0, 0, err
		}

		if parentCount >= 2 {
			return 0, 0, ErrParentLimitReached
		}

		xOffset := -220.0
		if parentCount == 1 {
			xOffset = 220.0
		}

		return anchorX + xOffset, anchorY - 240, nil
	case "child":
		var childCount int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM parent_child_relationships
			WHERE parent_person_id = $1
		`, anchorPersonID).Scan(&childCount); err != nil {
			return 0, 0, err
		}

		return anchorX + alternatingOffset(childCount), anchorY + 240, nil
	default:
		return 0, 0, fmt.Errorf("%w: %s", ErrInvalidRelation, relation)
	}
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
