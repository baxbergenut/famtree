# famtree

Modern family tree builder for creating and exploring a personal family graph on a borderless canvas.

## Status

The repository now contains the first implementation scaffold:

- `frontend/` Next.js app shell
- `backend/` Go API with PostgreSQL-backed auth/session endpoints
- planning docs and contributor guidance

The next milestone is to expand tree CRUD, canvas persistence, and media handling on top of the working auth flow.

## Product vision

`famtree` is a visual family tree web app where the signed-in user lands on an infinite-style canvas centered on their own highlighted person node. From that root node, the user can add parents and children, edit person details, and gradually build out a navigable family graph.

Each person node should support:

- profile photo
- first name
- last name
- optional note such as `dad`, `cousin`, or `grandma`
- birth date stored in the backend

If a person has no photo, the UI should render a placeholder person icon.

## Core MVP requirements

- Email registration
- Login and logout
- Auto-created root person for the signed-in user
- Borderless, pannable, zoomable canvas
- Root node highlighted visually
- Create parent from any existing person node
- Create child from any existing person node
- Edit person details
- Upload and display profile images
- Persist nodes, relationships, and layout coordinates

## Recommended architecture

### Frontend

- Framework: Next.js
- Responsibility: authentication screens, protected app shell, canvas rendering, person forms, image upload UI, viewport state, and client-side interaction logic

### Backend

- Language: Go
- Responsibility: auth, sessions, tree/person/relationship APIs, media handling, validation, and persistence

### Persistence

- Database: PostgreSQL
- File storage: S3-compatible object storage or a local storage abstraction during early development

## Planned repository structure

```text
famtree/
  frontend/
  backend/
  docs/
  infra/
  scripts/
  README.md
  AGENTS.md
```

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
2. Apply `init.sql` to create the initial schema.
3. Set `DATABASE_URL` for the backend before starting the API.

There is also a helper script:

```bash
powershell -ExecutionPolicy Bypass -File scripts/init-db.ps1
```

## High-level technical approach

- Use a monorepo with separate frontend and backend folders.
- Use cookie-based session auth for a straightforward and secure MVP.
- Model the family graph with `persons` and `parent_child_relationships`.
- Store manual node coordinates so users can refine the layout after the initial auto-assisted placement.
- Keep the first version focused on one private tree per account.

## Canvas interaction model

- The canvas opens centered on the signed-in user's root node.
- New parents are suggested above a selected node.
- New children are suggested below a selected node.
- Users can drag nodes to improve readability.
- The system persists updated coordinates after drag operations.
- The app should feel elegant and uncluttered, not like an admin dashboard.

## Initial implementation phases

1. Project foundation and repo structure
2. Authentication and user-root bootstrap
3. Tree data model and API surface
4. Canvas workspace and node interactions
5. Image handling and visual polish
6. Testing, security hardening, and deployment setup

## Engineering priorities

- Build the MVP first
- Prefer simple, explicit architecture over premature abstraction
- Keep frontend and backend concerns cleanly separated
- Optimize for correctness in auth and relationship validation
- Preserve room for future extensions such as spouses, sharing, and import/export

## Next steps

- Implement person and relationship write APIs
- Connect the canvas workspace to live tree data
- Add image upload and media persistence

## Planning docs

- Detailed implementation plan: [`docs/implementation-plan.md`](docs/implementation-plan.md)
