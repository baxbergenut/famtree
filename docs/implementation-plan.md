# Implementation Plan

## 1. Project summary

`famtree` is a family tree web app centered around a borderless canvas where a signed-in user builds a personal family graph visually.

The scaffold currently supports:

- registration and login
- cookie-backed sessions
- automatic root-person creation
- graph hydration from the backend
- interactive canvas pan, zoom, drag, add parent, and add child
- persisted person coordinates

## 2. Current architectural decisions

### Frontend

- Next.js App Router
- client-side canvas workspace in React
- thin API client in `frontend/lib/api.ts`

### Backend

- Go service with layered packages
- thin HTTP handlers in `backend/internal/http`
- auth logic in `backend/internal/auth`
- graph and family-domain logic in `backend/internal/tree`

### Persistence

- PostgreSQL
- bootstrap schema in `init.sql`
- explicit SQL through the standard library and pgx driver

## 3. Current domain model

The family graph uses a shared parental unit instead of direct parent-to-child edges.

Core records:

- `users`
- `trees`
- `persons`
- `family_units`
- `family_unit_parents`
- `family_unit_children`
- `media_assets`
- `sessions`

Why this model:

- two parents can share the same children without duplicating edges
- the UI can render a partner line once and attach children to the shared connector
- the backend can enforce a cleaner rule set around one-or-two-parent units

Current MVP constraints:

- one private tree per user
- one explicit root person per tree
- one child belongs to one family unit
- one family unit has at most two parents
- note fields stay informational and are not structural

## 4. Current fetch and render flow

### Fetch

The frontend loads:

1. `GET /v1/auth/me`
2. `GET /v1/tree/graph`

The graph response contains:

- `treeId`
- `rootPersonId`
- `persons`
- `familyUnits`

### Render

The canvas:

1. centers on `rootPersonId`
2. renders each person card at its persisted `x` and `y`
3. renders each family unit as:
   - parent drops to a shared partner line
   - a central trunk
   - a sibling bar
   - child drops to each child card

### Mutations

- `POST /v1/persons/relative`
- `PATCH /v1/persons/{personID}/position`

Relative creation rules:

- adding a parent reuses the child's existing family unit when available
- adding a child reuses the parent's most recently active family unit when available
- otherwise a new family unit is created automatically

## 5. Implemented API surface

### Auth

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

### Tree

- `GET /v1/tree`
- `GET /v1/tree/graph`

### Persons

- `POST /v1/persons/relative`
- `PATCH /v1/persons/{personID}/position`

## 6. What is still missing

- editing person details after creation
- photo upload and media association
- explicit co-parent selection when one parent has multiple family units
- deletion semantics
- migrations beyond the bootstrap SQL
- automated tests
- auth hardening like CSRF and rate limiting

## 7. Recommended next steps

### Phase 1: Person editing

- add `PATCH /v1/persons/{id}`
- expose note and birth-date editing in the workspace UI

### Phase 2: Media

- add upload validation and media association
- render real profile photos with placeholder fallback

### Phase 3: Family-unit controls

- support choosing which family unit a new child belongs to when a parent has multiple family groups
- support editing and inspecting the family unit itself

### Phase 4: Hardening

- add backend tests for auth, graph fetch, relative creation, and position persistence
- add frontend integration coverage for the workspace
- add production security and deployment docs

## 8. Risks to watch

- a single parent may eventually need multiple family units, which will require explicit selection in the UI
- deletion semantics will get tricky once several children share the same family unit
- canvas rendering will need optimization if tree sizes grow significantly
- ownership checks must stay consistent on every graph mutation
