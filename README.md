# famtree

Modern family tree builder for creating and exploring a personal family graph on a borderless canvas.

## Current state

The repository already has the first working vertical slice:

- `frontend/` Next.js App Router application
- `backend/` Go API with PostgreSQL-backed auth and session management
- automatic root-person bootstrap on registration
- protected workspace canvas with pan, zoom, drag, add parent, add child
- persisted node coordinates
- graph hydration from a single backend fetch

Still intentionally unfinished:

- person editing beyond create flows
- profile photo upload and media storage
- production hardening, migrations, and test coverage

## Product model

`famtree` is a visual family tree web app where the signed-in user lands on a canvas centered on their own highlighted root person node. From there they can add parents and children and gradually build a readable family graph.

Each person node supports:

- first name
- last name
- optional note
- stored birth date
- reserved space for a profile photo with placeholder fallback in the UI

## Structural rule: union nodes

The graph no longer models the tree as independent parent-to-child edges or ad hoc connector geometry.

Instead, it uses explicit `union` nodes:

- one union groups one or two parent people
- children attach to that union
- the frontend renders people and unions as a DAG in React Flow
- edges run `person -> union -> person`

This is the standard family-tree graph pattern and avoids duplicating the same child connections for each parent.

Current MVP behavior:

- adding a parent to a child reuses that child's existing union when possible
- adding a child from a parent reuses that parent's most recently active union, or creates one if needed
- a child can belong to only one union in the current model
- a union can have at most two parents

## Architecture

### Frontend

- Framework: Next.js App Router
- Graph rendering: React Flow with custom `person` and `union` nodes
- Responsibility: auth pages, protected workspace, graph rendering, viewport interaction, and person creation flows

### Backend

- Language: Go
- Responsibility: auth, sessions, tree graph reads, relative creation rules, authorization, and persistence

### Persistence

- Database: PostgreSQL
- Bootstrap schema: `init.sql`

## Current data architecture

The live scaffold uses these core records:

- `users`
- `trees`
- `persons`
- `family_units`
- `family_unit_parents`
- `family_unit_children`
- `media_assets`
- `sessions`

Important rules:

- each user owns exactly one tree in MVP
- each tree stores its explicit `root_person_id`
- `persons` store persisted canvas coordinates in `x` and `y`
- `family_units` store the union-node records in the database
- `family_unit_parents` links people into a union
- `family_unit_children` links children to that union

## How tree fetching works

The frontend loads the workspace with two authenticated requests:

1. `GET /v1/auth/me` returns the current session user
2. `GET /v1/tree/graph` returns the whole canvas graph

The graph payload currently looks like this:

```json
{
  "treeId": "tree-uuid",
  "rootPersonId": "person-uuid",
  "persons": [
    {
      "id": "person-uuid",
      "firstName": "Avery",
      "lastName": "Rivera",
      "note": "you",
      "birthDate": null,
      "x": 0,
      "y": 0,
      "isRoot": true
    }
  ],
  "unions": [
    {
      "id": "union-uuid",
      "parentIds": ["parent-a", "parent-b"],
      "childIds": ["child-a", "child-b"]
    }
  ]
}
```

That single graph response is enough for the canvas to render the tree.

## How tree display works

The workspace renderer does three things:

1. It centers the camera on `rootPersonId` when the graph loads.
2. It derives union-node positions from the connected people.
3. It hands the whole DAG to React Flow as custom nodes and smooth edges.
4. It lets React Flow handle pan, zoom, and edge rendering while we persist only person coordinates.

That keeps the backend domain normalized and the frontend rendering logic much cleaner.

## Current API surface

Auth:

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Tree:

- `GET /v1/tree`
- `GET /v1/tree/graph`

Persons:

- `POST /v1/persons/relative`
- `PATCH /v1/persons/{personID}/position`

## Local development

### Frontend

```bash
cd frontend
npm run dev
```

Runs the Next.js app on `http://localhost:3000`.

### Backend

```bash
cd backend
go run ./cmd/api
```

Runs the Go API on `http://localhost:8081` by default.

### Environment files

- Frontend example env: `frontend/.env.example`
- Backend example env: `backend/.env.example`
- Database bootstrap SQL: `init.sql`

### PostgreSQL setup

1. Create the `famtree` database.
2. Apply `init.sql`.
3. Set `DATABASE_URL` for the backend before starting the API.

Helper script:

```bash
powershell -ExecutionPolicy Bypass -File scripts/init-db.ps1
```

## Next priorities

1. Add explicit person editing flows.
2. Add profile photo upload and media persistence.
3. Harden relationship and union editing rules.
4. Add tests for auth, graph fetch, relative creation, and position persistence.

## Planning docs

- Detailed implementation plan: [`docs/implementation-plan.md`](docs/implementation-plan.md)
