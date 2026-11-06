# CLAUDE.md

## Project memory
This repo's notes (decisions, status, next steps, log) live in the private vault:
`Caylor-Made-Technologies/obsidian-vault` → `Projects/Critical Facilities Simulator.md`.
Read that note before working here, and attach the vault repo to the session.

**Before the session ends** (as the last step of any task that changed something):
1. Update the vault note: a dated line under **Log**, new **Decisions** with reasons, current **Status**, **Next steps**.
2. Commit and push the vault to `main`, then say in one line what was saved.

## Rules for this repo
- Generic and public only: no real company, site, equipment tag, vendor model, IP address, or photo.
  - Exception (Jonathon's call, 2026-11-02): career content may name real certifications and the
    organizations that issue them (incl. private training firms), as education only. No logos, no
    prices, no affiliate links, no endorsement wording; say "check the issuer's current details".
  - Exception (Jonathon's call, 2026-11-06): "Kirk key" stays as the trade term, credited to its
    trademark owner on About and in the glossary. Standards are named with their numbers (e.g. OSHA
    1910.147, NFPA 70E) but clause text is never quoted. Enforced: `src/sim/__tests__/generic.test.ts`.
- Static site: no backend, analytics, cookies, external calls, or data collection. Must work offline.
- No AI-tool branding in commits, PRs, code comments, or published files. Commit as
  `Caylor Made Technologies <andycaylor@icloud.com>`. Branch names stay plain (no `claude/`).
- Apply the 20 legal/quality points (see `docs/CHECKLIST.md`) to every change and say which ones it touched.
- Every formula lives in `src/sim/physics.ts`. The engine (`src/sim/`) has no UI imports.
- Run `npm test` and `npm run typecheck` before pushing.
- This file is not published: the site ships only Vite's `dist/` output.
