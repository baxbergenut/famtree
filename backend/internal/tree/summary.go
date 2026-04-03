package tree

import (
	"context"
	"database/sql"
	"errors"
)

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
