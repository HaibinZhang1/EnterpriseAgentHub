# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains product documentation and a static UI prototype.

- `docs/RequirementDocument/` holds the P1/P2/P3 requirements, page specs, data contracts, and glossary. Start with `docs/RequirementDocument/index.md`.
- `docs/DetailedDesign/` contains implementation-oriented design notes. Start with `docs/DetailedDesign/index.md` before adding architecture or deployment code.
- `ui-prototype/` is a standalone prototype: `index.html`, `app.js`, and `styles.css`. It is vanilla HTML/CSS/JavaScript; no package manager or build system is present yet.
- `.omx/` is local orchestration state and should not be treated as product source.
- 如果本次修改涉及到需求上的变动，请同步修改'docs/RequirementDocument/'

## Build, Test, and Development Commands

No project-level `package.json`, Makefile, or test runner is checked in yet. For the current prototype:

```sh
python3 -m http.server 8000 --directory ui-prototype
open http://localhost:8000
```

You may also open `ui-prototype/index.html` directly in a browser. When adding future tooling, commit the manifest and document the canonical commands here, for example `npm run dev`, `npm test`, or `docker compose up`.

## Coding Style & Naming Conventions

Use 2-space indentation for HTML, CSS, and JavaScript. Follow the existing JavaScript style in `ui-prototype/app.js`: `const`/`let`, camelCase variables, double-quoted strings, semicolons, and descriptive object field names. Keep CSS organized around custom properties in `:root`, reusable class selectors, and accessible focus/disabled states. Preserve the existing Chinese product copy unless a requirement document calls for a wording change.

## Testing Guidelines

Automated tests are not configured in this snapshot. For now, manually smoke-test the prototype in a browser after UI edits: login/entry flow, market browsing, search/filter controls, install/update actions, toasts, empty/error states, and responsive layout. When introducing tests, colocate them near the implemented source or in a clear `tests/` directory and document the runner command in this file.

## Commit & Pull Request Guidelines

This checkout has no Git history to infer conventions from. Use imperative, intent-focused commit subjects that explain why the change exists. Prefer Lore-style trailers when useful, such as `Constraint:`, `Rejected:`, `Tested:`, and `Not-tested:`. Pull requests should summarize scope, link the relevant requirement/design docs, list verification performed, and include screenshots or short recordings for UI changes.
