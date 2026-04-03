# Implementation Plan

## 1. Project summary

`famtree` is a family tree web app centered around a borderless canvas where a signed-in user builds a personal family graph visually. The primary user flow is:

1. Register or log in with email and password.
2. Land on the app canvas centered on the signed-in user's root person node.
3. Add parents and children from existing nodes.
4. Edit person details, upload profile photos, and continue expanding the graph.

The recommended implementation is a monorepo with:

- a `frontend/` Next.js application for the canvas UI and auth flows
- a `backend/` Go service for authentication, graph persistence, and media handling
- PostgreSQL for relational data
- S3-compatible object storage or a local file abstraction for profile images

## 2. Assumptions

- MVP supports one private tree per user account.
- The signed-in user always owns the tree being viewed and edited.
- Parent-child links are the only structural relationship type in MVP.
- Each person can have at most two parents in MVP validation.
- Birth date is optional but persisted if provided.
- The optional note field is freeform text and is not used for graph logic.
- The first release does not include collaboration, sharing, import/export, or advanced genealogy semantics.
- Recommendation: deploy frontend and backend behind the same top-level domain so cookie-based session auth stays simple.

## 3. Recommended architecture

### Overall shape

- Monorepo with separate frontend and backend applications.
- REST API between frontend and backend over HTTPS with JSON payloads.
- Cookie-based session authentication with server-side session storage.
- Relational persistence for users, trees, people, and relationships.

### Frontend responsibilities

- Registration, login, logout, and protected routing
- Canvas rendering and viewport management
- Node selection, dragging, create-parent, create-child, and edit-person flows
- Optimistic UI for low-latency interactions where safe
- Image upload UX and placeholder rendering
- Visual design system and app shell

### Backend responsibilities

- User registration, login, logout, and session lifecycle
- Tree bootstrap on signup
- Person and relationship validation
- Graph read and write APIs
- Media upload validation and storage coordination
- Authorization checks for every tree mutation

### Frontend-backend communication

- Use `fetch` or a thin API client layer in the frontend.
- Send authenticated requests with cookies.
- Use JSON for app data endpoints.
- Use multipart upload through the backend for MVP image uploads.
- Return a single graph payload for canvas hydration to minimize initial request chatter.

## 4. Repository structure

```text
famtree/
  frontend/
    app/
    components/
    features/
    lib/
    styles/
    public/
    tests/
  backend/
    cmd/api/
    internal/
      auth/
      tree/
      media/
      http/
      store/
      config/
    migrations/
    tests/
  docs/
    implementation-plan.md
  infra/
  scripts/
  README.md
  AGENTS.md
```

## 5. Frontend plan (Next.js)

### Router choice

Use the App Router.

Why:

- best fit for a new Next.js app
- clean layout composition for auth and app shells
- easy separation between public auth screens and protected workspace routes

Main alternative:

- Pages Router is simpler for older patterns but less aligned with a fresh build.

### Main pages

- `/login`
- `/register`
- `/app` as the protected family tree workspace

Potential later routes:

- `/settings`
- `/account`

### Main feature areas

- `auth`: forms, validation, session bootstrapping
- `canvas`: viewport, nodes, edges, controls
- `persons`: create/edit forms, profile image upload, note and birth date editing
- `tree-data`: graph hydration and persistence

### Component plan

- `AppShell`
- `CanvasWorkspace`
- `CanvasControls`
- `PersonNodeCard`
- `RelationshipEdges`
- `NodeActionMenu`
- `PersonEditorSheet`
- `PhotoUploader`
- `AuthForm`
- `RootNodeBadge`

### State management

- Use TanStack Query for server state.
- Use Zustand for canvas-local state such as selected node, viewport position, zoom level, and transient interaction state.
- Use React Hook Form with Zod for login, registration, and person editor forms.

### Canvas interaction model

- Load the graph and viewport seed after auth.
- Center the initial view on the root person.
- Support panning with drag on empty canvas.
- Support zoom by wheel and trackpad gesture.
- Support dragging nodes to update coordinates.
- Persist node position after drag end.
- Show contextual controls on node focus or hover.

### Borderless canvas concept

- Treat the workspace as a large coordinate plane instead of a finite board.
- Store each person node with `x` and `y` coordinates.
- Render a subtle background texture to suggest space without feeling boxed in.
- Avoid visible canvas edges, frames, or bounding borders.

### Nodes and connectors

- Represent people as custom cards, not generic flowchart boxes.
- Render parent-child connections as clean, understated lines.
- Keep edge styling secondary to node cards so the interface remains elegant.

### Root node treatment

- Add a distinct accent ring, badge, or elevated card treatment.
- Use a stable highlight color reserved only for the root node.
- Keep the styling refined rather than loud.

### Empty photo fallback

- Render a circular avatar container with a person icon.
- Optionally show initials later, but icon-first is enough for MVP.
- Keep sizing and border treatment identical between real images and placeholders to avoid layout shift.

### Styling direction

- Editorial minimalism rather than dashboard UI
- Soft neutral canvas background with subtle texture
- Refined accent color for actions and root highlighting
- Rounded node cards, generous spacing, clear hierarchy
- Intentional typography and sparse chrome

## 6. Backend plan (Go)

### Recommended structure

Use a layered Go service:

- `cmd/api`: app bootstrap and wiring
- `internal/http`: router, middleware, handlers
- `internal/auth`: auth and session services
- `internal/tree`: person, relationship, and graph services
- `internal/media`: upload validation and storage coordination
- `internal/store`: query layer and transaction helpers
- `internal/config`: environment loading

Why:

- keeps request plumbing separate from business logic
- makes validation and persistence testable
- scales cleanly without overengineering

### API style

- Versioned REST endpoints under `/v1`
- JSON request and response bodies
- Server-managed session cookies
- Consistent error shape for validation, auth, and server failures

### Core backend business logic

- Register user and create initial tree and root person in one transaction
- Verify every person and relationship belongs to the authenticated user's tree
- Validate maximum parent count
- Prevent self-links and duplicate parent-child links
- Persist coordinates as part of the person record

## 7. Data model

### Main entities

#### User

- `id`
- `email`
- `password_hash`
- `created_at`
- `updated_at`
- `last_login_at`

#### Tree

- `id`
- `owner_user_id`
- `root_person_id`
- `created_at`
- `updated_at`

#### Person

- `id`
- `tree_id`
- `first_name`
- `last_name`
- `note` nullable
- `birth_date` nullable
- `photo_asset_id` nullable
- `x`
- `y`
- `created_by_user_id`
- `created_at`
- `updated_at`

#### ParentChildRelationship

- `id`
- `tree_id`
- `parent_person_id`
- `child_person_id`
- `created_at`

#### MediaAsset

- `id`
- `owner_user_id`
- `storage_key`
- `public_url` or resolved URL field
- `content_type`
- `file_size`
- `created_at`

#### Session

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `last_seen_at`
- `created_at`

### Relationship representation

- Represent family structure with directed parent-child edges.
- A child may have zero, one, or two parents in MVP.
- Tree ownership is enforced through `tree_id`.

### Root-person requirement

- Store the root person explicitly on the tree record.
- Root semantics should not depend on node position or creation order.

### Extensibility notes

- Add spouse or partner relationships later as a new relationship type or separate table.
- Add person metadata such as death date, location, or biography later without changing the graph core.

## 8. Database design

### Recommendation

Use PostgreSQL.

Why:

- strong relational integrity
- flexible indexing
- good fit for transactional graph mutations with bounded complexity
- mature support in Go ecosystems

### Main tables

- `users`
- `trees`
- `persons`
- `parent_child_relationships`
- `media_assets`
- `sessions`

### Key constraints

- unique email on `users`
- unique owner on `trees` for MVP one-tree-per-user rule
- unique `(parent_person_id, child_person_id)` on relationship rows
- check constraint preventing identical parent and child IDs
- foreign keys from people and relationships back to tree ownership

### Important indexes

- `users(email)`
- `persons(tree_id)`
- `parent_child_relationships(tree_id, parent_person_id)`
- `parent_child_relationships(tree_id, child_person_id)`
- `sessions(user_id)`
- `sessions(expires_at)`

## 9. Authentication plan

### Registration

- Accept email and password.
- Validate input shape and password minimum standards.
- Hash password with Argon2id or bcrypt.
- Create user, tree, root person, and session in one transaction.

### Login

- Validate credentials.
- Issue a new opaque session token.
- Store only the token hash in the database.
- Send the raw token in a secure `HttpOnly` cookie.

### Logout

- Delete or invalidate the current session server-side.
- Expire the cookie client-side.

### Session strategy

- Use cookie-based sessions for MVP.
- Set `Secure`, `HttpOnly`, and appropriate `SameSite` values.
- Add CSRF protection for state-changing requests.
- Add rate limiting to login and registration endpoints.

Main alternative:

- JWT plus refresh tokens can support more distributed auth setups, but it increases complexity and is unnecessary for MVP.

## 10. Canvas and tree interaction design

### Person creation flows

- Selecting a node reveals actions for `Add parent` and `Add child`.
- Clicking one opens a compact editor panel or sheet.
- Submitting creates the person and the relationship in one backend flow.

### Placement strategy

Recommended approach: hybrid layout.

- Auto-suggest initial placement for new nodes.
- Allow manual dragging afterward.
- Persist the final user-adjusted coordinates.

Suggested defaults:

- parent above the source node
- child below the source node
- horizontal offsets for multiple siblings or parents
- collision-aware adjustments if a suggested position is already occupied

### Tradeoffs

- Pure auto-layout is cleaner initially but hard to control for real-world family structures.
- Pure manual layout is flexible but becomes messy quickly.
- Hybrid placement gives good defaults while preserving user control.

## 11. API surface

### Auth

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

### Tree

- `GET /v1/tree`
- `GET /v1/tree/graph`

### Persons

- `POST /v1/persons`
- `PATCH /v1/persons/{id}`
- `PATCH /v1/persons/{id}/position`
- `DELETE /v1/persons/{id}` if deletion is supported in MVP

### Relationships

- `POST /v1/relationships/parent-child`
- `DELETE /v1/relationships/{id}`

### Media

- `POST /v1/media/profile-photo/upload`
- `POST /v1/persons/{id}/photo`
- `DELETE /v1/persons/{id}/photo`

## 12. Image handling

### Upload flow

- User selects an image from the person editor.
- Frontend uploads via multipart request to the backend.
- Backend validates type and size, stores the file, creates a `media_assets` row, and associates the asset to the person.

### Storage recommendation

- MVP can start with an abstraction that supports local filesystem storage in development and S3-compatible storage in deployed environments.

### Display behavior

- The frontend receives an image URL or asset reference from the API.
- If no image is present, render the placeholder avatar icon.

## 13. MVP scope

### Must-have

- register, login, logout
- root person bootstrap
- protected app route
- graph fetch API
- create parent and child
- edit person details
- upload photo
- fallback avatar
- drag and persist node positions
- root node highlight

### Nice-to-have later

- spouses or partners
- sibling shortcuts
- search
- undo or redo
- import/export
- invite and share
- collaboration
- timeline or profile views

## 14. Implementation phases

### Phase 1: Foundation

- Objective: establish repo and runtime foundation.
- Key tasks:
  - create `frontend/` and `backend/`
  - set up environment variable strategy
  - define local dev ports and routing
  - choose package and module names
- Dependencies: none
- Output: runnable shell apps and repo structure

### Phase 2: Database and backend skeleton

- Objective: establish persistence and service wiring.
- Key tasks:
  - create database schema migrations
  - wire database connection
  - add router, middleware, and health endpoint
  - add repository and transaction patterns
- Dependencies: Phase 1
- Output: backend skeleton with database integration

### Phase 3: Auth and root bootstrap

- Objective: make users able to register and enter the product.
- Key tasks:
  - implement registration, login, logout, and session lookup
  - create tree and root person on registration
  - protect frontend app route
- Dependencies: Phase 2
- Output: authenticated user can reach a protected app shell

### Phase 4: Tree API and data editing

- Objective: make family graph data readable and editable.
- Key tasks:
  - implement graph fetch
  - add create and update person flows
  - add create relationship flow
  - validate tree ownership and relationship rules
- Dependencies: Phase 3
- Output: complete tree CRUD foundation for MVP

### Phase 5: Canvas workspace

- Objective: deliver the main visual product experience.
- Key tasks:
  - build node and edge rendering
  - implement pan, zoom, selection, and drag
  - center initial view on the root node
  - add parent and child actions from node UI
  - persist updated positions
- Dependencies: Phase 4
- Output: interactive family tree canvas

### Phase 6: Media and UI polish

- Objective: complete the person-card experience.
- Key tasks:
  - implement photo upload and association
  - add avatar placeholder
  - refine loading, empty, and error states
  - polish styling and responsiveness
- Dependencies: Phases 4 and 5
- Output: visually coherent MVP

### Phase 7: Hardening and release prep

- Objective: make the MVP safe and deployable.
- Key tasks:
  - add automated tests
  - add auth hardening and rate limiting
  - add logging and environment docs
  - prepare deployment configuration
- Dependencies: all earlier phases
- Output: deployment-ready MVP

## 15. Risks and technical challenges

- Canvas rendering can become expensive if the graph grows; use viewport culling and lightweight rendering primitives.
- Real-world family data is not always a perfect tree; keep MVP logic limited to parent-child structure and freeform notes.
- Hybrid layout needs careful placement defaults to avoid immediate visual overlap.
- Auth bugs can expose another user's tree if ownership checks are inconsistent.
- Image uploads create security and storage risks if validation is weak.
- Deletion semantics can get tricky if a person has several connected descendants.

## 16. Testing strategy

### Frontend

- Component tests for auth forms, person cards, placeholder avatars, and editor panels
- Integration tests for login, initial root render, adding parent, adding child, and drag persistence
- Responsive checks for the main canvas workspace

### Backend

- Unit tests for auth service, session handling, validation, and graph rules
- API tests for register, login, logout, graph fetch, create person, update person, position update, and relationship creation
- Database-level tests for transaction behavior and constraints where useful

### Critical edge cases

- duplicate email registration
- invalid password or login failure
- adding a third parent
- self-link attempt
- duplicate parent-child edge
- unauthorized access to another tree
- missing image fallback
- empty initial tree after registration should still show the root person

## 17. Deployment considerations

### Recommended simple deployment

- Frontend: Vercel or container-based hosting
- Backend: Fly.io, Render, Railway, or another small-team-friendly container host
- Database: managed PostgreSQL
- Media: S3-compatible object storage

### Operational concerns

- Keep frontend and backend under one primary domain if possible.
- Store secrets in the hosting platform's secret manager.
- Define environments for local, staging, and production.
- Plan backups for PostgreSQL and lifecycle rules for media storage.

### Environment variables

- database connection string
- session secret
- app base URL
- API base URL where needed
- cookie domain
- allowed dev origins
- storage credentials
- max upload size

## 18. Recommended tooling and libraries

### Next.js UI

- Tailwind CSS: fast, consistent styling with enough control for a custom visual identity
- Radix UI primitives: accessible foundations without forcing a generic design system

### Canvas rendering and interaction

- React Flow: strong MVP choice for node/edge rendering, panning, zooming, dragging, and custom node UI

Main alternative:

- Konva or D3 offers more low-level control, but implementation time is longer.

### Forms

- React Hook Form: efficient forms with low boilerplate
- Zod: schema-based validation that pairs well with forms and API payloads

### Auth

- Custom email/password auth with secure Go-managed sessions

### Go routing and server framework

- Chi: lightweight, idiomatic, and enough for a focused service

### ORM or SQL tooling

- `sqlc`: explicit SQL with generated type-safe Go bindings

Main alternative:

- GORM is quicker to start with but less explicit and harder to reason about as queries become more important.

### File and image uploads

- `aws-sdk-go-v2` for S3-compatible storage
- Go standard library image handling or a small imaging package for normalization and thumbnailing if needed

## 19. Open questions

- Should deletion of a person be part of MVP, and if yes, what happens to existing descendants and relationships?
- Should the app support only biological parent-child links in MVP, or should adoptive and guardian relationships be modeled early?
- Is one private tree per user enough for launch, or is sharing expected soon after?
- Should the root person's name be collected during registration or edited after the first login?
- Do we want image cropping in MVP, or is raw photo upload acceptable for the first version?
