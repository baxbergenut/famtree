package tree

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
)

func (s *Service) GetGraphByOwnerUserID(ctx context.Context, ownerUserID string) (Graph, error) {
	if err := s.backfillLegacyRelationships(ctx, ownerUserID); err != nil {
		return Graph{}, err
	}

	graph := Graph{
		Persons: []Person{},
		Unions:  []Union{},
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

	if err := s.loadPersons(ctx, ownerUserID, &graph); err != nil {
		return Graph{}, err
	}

	if err := s.loadUnions(ctx, ownerUserID, &graph); err != nil {
		return Graph{}, err
	}

	return graph, nil
}

func (s *Service) loadPersons(ctx context.Context, ownerUserID string, graph *Graph) error {
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
		return err
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
			return err
		}

		if note.Valid {
			person.Note = &note.String
		}

		if birthDate.Valid {
			person.BirthDate = &birthDate.String
		}

		graph.Persons = append(graph.Persons, person)
	}

	return personRows.Err()
}

func (s *Service) loadUnions(ctx context.Context, ownerUserID string, graph *Graph) error {
	unionRows, err := s.db.QueryContext(ctx, `
		SELECT fu.id
		FROM family_units fu
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY fu.created_at ASC
	`, ownerUserID)
	if err != nil {
		return err
	}
	defer unionRows.Close()

	unionIndexByID := map[string]int{}
	for unionRows.Next() {
		var union Union
		if err := unionRows.Scan(&union.ID); err != nil {
			return err
		}

		union.ParentIDs = []string{}
		union.ChildIDs = []string{}
		unionIndexByID[union.ID] = len(graph.Unions)
		graph.Unions = append(graph.Unions, union)
	}

	if err := unionRows.Err(); err != nil {
		return err
	}

	if err := s.loadUnionParents(ctx, ownerUserID, unionIndexByID, graph); err != nil {
		return err
	}

	return s.loadUnionChildren(ctx, ownerUserID, unionIndexByID, graph)
}

func (s *Service) loadUnionParents(
	ctx context.Context,
	ownerUserID string,
	unionIndexByID map[string]int,
	graph *Graph,
) error {
	parentRows, err := s.db.QueryContext(ctx, `
		SELECT fup.family_unit_id, fup.person_id
		FROM family_unit_parents fup
		JOIN family_units fu ON fu.id = fup.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY fup.created_at ASC
	`, ownerUserID)
	if err != nil {
		return err
	}
	defer parentRows.Close()

	for parentRows.Next() {
		var unionID string
		var personID string
		if err := parentRows.Scan(&unionID, &personID); err != nil {
			return err
		}

		if unionIndex, ok := unionIndexByID[unionID]; ok {
			graph.Unions[unionIndex].ParentIDs = append(graph.Unions[unionIndex].ParentIDs, personID)
		}
	}

	return parentRows.Err()
}

func (s *Service) loadUnionChildren(
	ctx context.Context,
	ownerUserID string,
	unionIndexByID map[string]int,
	graph *Graph,
) error {
	childRows, err := s.db.QueryContext(ctx, `
		SELECT fuc.family_unit_id, fuc.person_id
		FROM family_unit_children fuc
		JOIN family_units fu ON fu.id = fuc.family_unit_id
		JOIN trees t ON t.id = fu.tree_id
		WHERE t.owner_user_id = $1
		ORDER BY fuc.created_at ASC
	`, ownerUserID)
	if err != nil {
		return err
	}
	defer childRows.Close()

	for childRows.Next() {
		var unionID string
		var personID string
		if err := childRows.Scan(&unionID, &personID); err != nil {
			return err
		}

		if unionIndex, ok := unionIndexByID[unionID]; ok {
			graph.Unions[unionIndex].ChildIDs = append(graph.Unions[unionIndex].ChildIDs, personID)
		}
	}

	return childRows.Err()
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
		unionID, err := s.createUnion(ctx, tx, group.TreeID, ownerUserID)
		if err != nil {
			return err
		}

		for _, parentID := range group.ParentIDs {
			if err := s.attachParentToUnion(ctx, tx, unionID, parentID); err != nil {
				return err
			}
		}

		sort.Strings(group.ChildIDs)
		for _, childID := range group.ChildIDs {
			if err := s.attachChildToUnion(ctx, tx, unionID, childID); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}
