# Kaksha

A school timetable system. Three workspaces:

| Workspace | Purpose                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `core`    | Domain types, Zod schemas, filtering and derivation. No runtime dependencies beyond Zod, so it runs on the server and in the app. |
| `server`  | Express API over Postgres via Drizzle. Deploys to Vercel.                                                                         |
| `mobile`  | Expo app, Android first, laid out for tablets.                                                                                    |

## Rules that CI enforces

Every one of these has a workflow in `.github/workflows`. Run them locally before pushing.

- **No code comments.** Names and structure carry the meaning. Only functional directives are allowed: `eslint-*`, `@ts-*`, `biome-ignore`, `prettier-ignore`, `/*! license */`. Checked by `npm run check:comments`.
- **No em dashes** anywhere in the repo. Use a comma, colon, or a separate sentence.
- **No leftovers**: no `console.log` in source, no `debugger`, no `.only` tests, no conflict markers, no `TODO` or `FIXME`.
- **Types are strict.** `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. No `any`, no non-null assertions outside tests.
- **Lint is type-aware.** `typescript-eslint` strict plus stylistic, with type information.
- **No dead code.** Knip fails on unused files, exports and dependencies. Do not export something before it has a caller.
- **Tests must pass** and cover the domain logic in `core`.

## Local commands

```bash
npm run typecheck      # every workspace
npm run lint           # eslint, type-aware
npm run format         # prettier check
npm run test           # vitest
npm run check:comments # comment policy
npm run dead-code      # knip
npm run build          # core then server
```

## Conventions

- Imports inside `core` and `server` use explicit `.js` extensions; both are `NodeNext` ESM.
- Ids carry a table prefix: `sub_`, `tch_`, `sec_`, `ent_`. Zod enforces the shape.
- Anything crossing a boundary, whether a database row, a query parameter or a request body, is parsed by a Zod schema first.
