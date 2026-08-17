# Description

<!-- What does this change and why? Link the issue it closes, e.g. "Closes #12". -->

## Type of change

<!-- Tick all that apply. -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (existing behaviour or API changes)
- [ ] 📚 Documentation
- [ ] 🧹 Refactor or chore (no behaviour change)

## Service(s) touched

- [ ] `frontend/` — web app
- [ ] `server/` — API and redirects
- [ ] Repository tooling / docs

## Checks

<!--
Run these for each service you touched.
`npm test` (server) is not a gate yet — no tests exist. There is no ESLint setup either.
-->

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] I have self-reviewed the diff
- [ ] Comments explain *why* where the reasoning is not obvious

## Database

- [ ] No schema change
- [ ] Adds a new numbered migration in `server/sql/` and updates `server/src/db/schema.ts`

## Screenshots

<!-- Required for UI changes. Before/after if you are changing something that exists. -->

## Notes for the reviewer

<!-- Trade-offs, things you are unsure about, anything you deliberately left out. -->
