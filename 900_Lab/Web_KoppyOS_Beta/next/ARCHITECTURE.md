# Koppy World NEXT

## Purpose

NEXT is the parallel rebuild area for Koppy World.

Most legacy production pages remain operational and act as the
working specification while their NEXT replacements are rebuilt.

Kohaku Work has completed production URL promotion:

- Official: `/work/`
- NEXT mirror / retained preview path: `/next/work/`
- Legacy fallback: `/kohaku-work/`

## Core rules

- Do not replace current production pages during rebuild.
- World Frame is shared infrastructure, not NEXT-only code.
- `document` is used for ordinary pages.
- `app` is used for full applications.
- App Mode owns its own scrolling, sticky/fixed UI,
  drawers, modals, safe areas and z-index system.
- Kohaku Work app must not be wrapped in a World Frame shell.
- Existing APIs remain the source of truth unless an
  incompatible API change is explicitly required.

## Kohaku Work verification database

Kohaku Work used an isolated verification database created from
a production snapshot during write testing.

Rules:

- Production -> verification copy is allowed.
- Verification data must never be merged or copied back into production.
- Verification DB may be refreshed from production.
- Destructive testing occurs only against verification.
- After validation, Kohaku Work was switched to production data.

This is a test snapshot/clone strategy.
It is NOT bidirectional database replication.

## URL plan

| Role | Legacy | NEXT | Final |
| --- | --- | --- | --- |
| WORLD | `/` | `/next/` | `/` |
| WORK | `/kohaku-work/` | `/next/work/` | `/work/` |
| HOME | `/house/` | `/next/home/` | `/home/` |
| BRAIN | `/brain/` | `/next/brain/` | `/brain/` |
| KOPPY | `/chat/` | `/next/koppy/` | `/koppy/` |
| CALENDAR | `/kohaku-work/calendar/` | `/next/calendar/` | `/calendar/` |
| TOOLS | - | `/next/tools/` | `/tools/` |
| WRITER | `/writer/` | `/next/tools/writer/` | `/tools/writer/` |
| SYSTEM | `/system/` | `/next/tools/system/` | `/tools/system/` |
| DEPLOY | `/kohaku-work/deploy-status.html` | `/next/tools/deploy/` | `/tools/deploy/` |

## Migration order

1. Kohaku Work NEXT navigation / view structure
2. Kohaku Work read-only production API integration
3. Verification database
4. Write operations against verification DB
5. Shared Calendar
6. Home
7. Brain
8. Koppy
9. Tools
10. WORLD navigation
11. Production URL promotion — WORK completed 2026-09-20
