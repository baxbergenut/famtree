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

## Structural rule: shared family units

The graph no longer models the tree as independent parent-to-child edges.

Instead, it uses a shared `family unit`:

- one family unit groups one or two parent people
- children attach to that family unit
- the canvas renders a line between the parents
- the children connect to the shared family line, not to each parent separately

This matches the visual model better and avoids duplicate child links when two parents share the same children.

Current MVP behavior:

- adding a parent to a child reuses that child's existing family unit when possible
- adding a child from a parent reuses that parent's most recently active family unit, or creates one if needed
- a child can belong to only one family unit in the current model
- a family unit can have at most two parents

## Architecture

### Frontend

- Framework: Next.js App Router
- Responsibility: auth pages, protected workspace, canvas rendering, viewport interaction, and person creation flows

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
- `family_units` belong to a tree
- `family_unit_parents` links people into a shared parental unit
- `family_unit_children` links children to that unit

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
  "familyUnits": [
    {
      "id": "family-unit-uuid",
      "parentPersonIds": ["parent-a", "parent-b"],
      "childPersonIds": ["child-a", "child-b"]
    }
  ]
}
```

That single graph response is enough for the canvas to render the tree.

## How tree display works

The workspace renderer does three things:

1. It centers the camera on `rootPersonId` when the graph loads.
2. It renders every person as a draggable card at its stored `x` and `y`.
3. It renders each family unit as:
   - vertical connectors from parents down to a shared partner line
   - one shared trunk from that line
   - a sibling bar for the unit's children
   - vertical drops from the sibling bar to each child node

That gives us the "parents linked together, children linked to the union" layout you asked for.

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
3. Harden relationship and family-unit editing rules.
4. Add tests for auth, graph fetch, relative creation, and position persistence.

## Planning docs

- Detailed implementation plan: [`docs/implementation-plan.md`](docs/implementation-plan.md)
