# AGENTS.md

This file defines the working rules for engineers and coding agents contributing to `famdawg`.

## Project intent

Build a modern family tree application with:

- a Next.js frontend
- a Go backend
- a borderless family-tree canvas as the main user experience

The project should stay MVP-focused, visually refined, and realistic for a small team to build and maintain.

## Current stage

The initial scaffold already exists.

Current implemented slices:

- monorepo layout with `frontend/`, `backend/`, `docs/`, `infra/`, and `scripts/`
- email/password auth with cookie-based sessions
- automatic tree and root-person bootstrap on registration
- `GET /v1/tree/graph` canvas hydration
- interactive workspace shell with pan, zoom, drag, add parent, and add child
- persisted node coordinates in PostgreSQL

Still in progress:

- person editing beyond creation
- media upload and profile photo persistence
- migrations, tests, and deployment hardening

Treat the implementation plus `README.md` as the source of truth, and keep docs aligned whenever architecture changes.

## Non-negotiable product rules

- The signed-in user must have a special root person node.
- The initial canvas view must center on that root node.
- Root node styling must clearly distinguish it from other people.
- Every person node must support adding a parent and adding a child.
- Each person must support:
  - profile picture
  - first name
  - last name
  - optional note
  - stored birth date
- Birth date must be persisted even if it is not shown on the node by default.
- Missing photos must render a placeholder person icon.
- The UI must feel modern, minimal, and intentionally designed.

## Architecture guardrails

### Monorepo layout

- `frontend/` contains the Next.js application only.
- `backend/` contains the Go API only.
- Shared documentation belongs in `docs/`.
- Deployment and environment setup belong in `infra/` and `scripts/`.

Do not blur responsibilities between frontend and backend.

### Frontend rules

- Use Next.js App Router unless a concrete constraint forces otherwise.
- Prefer server state fetched from the backend over fragile client-owned graph state.
- Keep the canvas interaction model explicit: pan, zoom, drag, select, add parent, add child, edit person.
- Favor composable UI primitives over large generated component kits.
- The app should not look like a generic admin panel.

### Backend rules

- Keep handlers thin and move business rules into service/domain layers.
- Enforce ownership and tree boundaries on every authenticated request.
- Keep union validation centralized.
- Prefer explicit SQL or type-safe query tooling over heavy ORM magic.

## Data modeling guardrails

- `User`, `Tree`, `Person`, `Union`, `UnionParent`, `UnionChild`, `MediaAsset`, and `Session` are the baseline entities.
- The root person should be explicitly linked from the tree record.
- Union nodes are the canonical family structure in MVP.
- A union may have one or two parents.
- A child belongs to one union in the current MVP model.
- Persist node coordinates for layout state.
- Do not hard-code labels like `dad` or `cousin` as relationship semantics in MVP; keep them in the optional note field unless the domain model is intentionally expanded.

## Preferred implementation order

1. Repo scaffold
2. Auth and sessions
3. Root-person bootstrap on registration
4. Graph and union APIs
5. Canvas workspace
6. Image uploads
7. Testing and deployment hardening

Avoid jumping into advanced features before the flow above is stable.

## UX direction

- Minimal, editorial, calm, and polished
- Strong visual focus on the canvas
- Sparse controls with clear affordances
- Soft depth, restrained motion, and deliberate typography
- High signal, low clutter

When making design choices, prefer distinctive simplicity over feature-heavy chrome.

## API and domain expectations

- Auth should support register, login, logout, and current-session lookup.
- Tree APIs should expose the current user's graph in one efficient fetch for canvas hydration.
- Person creation should support context-aware creation from an existing node.
- Union creation and updates must validate tree ownership, prevent invalid self-links, cap parents at two, and avoid duplicate membership.
- Image APIs should validate file type and file size before associating media to a person.

## Quality bar

Before considering work complete, verify:

- the change respects the root-node product rule
- the change keeps frontend and backend responsibilities cleanly separated
- auth and authorization are enforced where relevant
- empty, loading, and error states are handled
- tests cover the critical path or the gap is documented clearly

## Things to avoid

- Do not introduce enterprise-scale infrastructure for MVP.
- Do not add multiple auth strategies.
- Do not over-model extended family semantics before MVP needs them.
- Do not depend on fragile client-only state for persisted graph data.
- Do not let visual design collapse into a default dashboard look.

## Decision defaults

If a decision is not yet documented, default to:

- PostgreSQL for the main database
- cookie-based sessions for auth
- S3-compatible media storage abstraction
- hybrid auto-assisted plus manual canvas layout
- one private tree per user for MVP

## Documentation rule

If implementation changes the architecture materially, update `README.md` and any relevant docs in the same change.
