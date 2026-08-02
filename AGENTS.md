# Kaksha

A school timetable system. Three workspaces:

| Workspace | Purpose                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `core`    | Domain types, Zod schemas, filtering and derivation. No runtime dependencies beyond Zod, so it runs on the server and in the app. |
| `server`  | Express API over Postgres via Drizzle. Deploys to Vercel.                                                                         |
| `mobile`  | Expo app, Android first, laid out for tablets.                                                                                    |

## Rules that CI enforces

Every one of these has a workflow in `.github/workflows`. Run them locally before pushing.

- **No code comments.** Names and structure carry the meaning. Only functional directives are allowed: `eslint-*`, `@ts-*`, `biome-ignore`, `prettier-ignore`, `/*! license */`. Checked by `bun run check:comments`.
- **No em dashes** anywhere in the repo. Use a comma, colon, or a separate sentence.
- **No leftovers**: no `console.log` in source, no `debugger`, no `.only` tests, no conflict markers, no `TODO` or `FIXME`.
- **Types are strict.** `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. No `any`, no non-null assertions outside tests.
- **Lint is type-aware.** `typescript-eslint` strict plus stylistic, with type information.
- **No dead code.** Knip fails on unused files, exports and dependencies. Do not export something before it has a caller.
- **Tests must pass** and cover the domain logic in `core`. They run on `bun test`.

## Local commands

```bash
bun run typecheck      # every workspace
bun run lint           # eslint, type-aware
bun run format         # prettier check
bun test               # bun's test runner
bun run check:comments # comment policy
bun run dead-code      # knip
bun run build          # core then server
```

### Building an APK

```bash
bun run apk         # cloud build via EAS, no local Android toolchain needed
bun run apk:local   # gradle on this machine, needs a JDK and the Android SDK
```

`apk:local` prebuilds the native project if it is missing, runs
`assembleRelease`, and copies the artifact to `mobile/build/`.

Pushing a change under `mobile/` or `core/` to main builds an APK on CI and
publishes it as a GitHub release. The semantic version comes from
`mobile/app.json`, so raising it is a normal pull request; the Android version
code comes from the run number, which always increases. It checks for the
JDK and SDK first and tells you what to install if either is absent. The
generated `mobile/android` directory is disposable and is not committed.

Bun is the only package manager and runtime. There is no npm lockfile and no
Node version file; `.bun-version` pins the toolchain for CI.

## Conventions

- Imports inside `core` and `server` use explicit `.js` extensions; both are `NodeNext` ESM.
- Ids carry a table prefix: `sub_`, `tch_`, `sec_`, `ent_`, `not_`. Zod enforces the shape.
- The app reads its API base from `extra.apiUrl` in `mobile/app.json`. Override it for a
  session with `EXPO_PUBLIC_API_URL=http://localhost:4000 bun start`.
- Anything crossing a boundary, whether a database row, a query parameter or a request body, is parsed by a Zod schema first.
