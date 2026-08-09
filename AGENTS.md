# Kaksha

A school timetable system. Three workspaces:

| Workspace | Purpose                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `core`    | Domain types, Zod schemas, filtering and derivation. No runtime dependencies beyond Zod, so it runs on the server and in the app. |
| `server`  | Express API over Postgres via Drizzle. Deploys to Vercel.                                                                         |
| `mobile`  | Expo app, Android first, laid out for tablets. The same code ships as the website.                                                |

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
bun run build:site     # core, server, then the web bundle into public/
```

### The website

`bun run build:site` exports the Expo app for the browser into `public/`, which
is generated and git ignored. Vercel serves that directory and rewrites `/api`
to the Express function, so the site and the API share one origin and the
browser talks to a relative `/api`.

Everything in `mobile/public/` is copied into the export as is, and
`mobile/public/index.html` is the page template, which is where the title, the
description and the Open Graph tags live. `%LANG_ISO_CODE%` and `%WEB_TITLE%`
are filled in from `app.json`. The card image is `mobile/public/og.png` at
2400x1260, referenced by absolute URL because scrapers do not resolve relative
ones. An `app/+html.tsx` would be ignored here, since Expo only renders it for
static output.

Anything the browser cannot do lives in a `.web` sibling that Metro picks up
for the web platform: `cache.web.ts` writes to `localStorage` instead of
`expo-file-system`, `access.web.ts` keeps the setup code there instead of
`expo-secure-store`, `update.web.ts` makes the APK updater inert, and
`shareImage.web.ts` downloads the PNG instead of calling `expo-sharing`.
`NoteEditor.web.tsx` is a contenteditable surface, because tentap runs inside a
WebView and `react-native-webview` renders a placeholder on the web.

To run it locally, point the app at a local API, since a bare `expo start --web`
has no server behind it:

```bash
cd mobile && EXPO_PUBLIC_API_URL=http://localhost:4000 bun run web
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

`bunx expo install --check` reports `react-native-reanimated` and
`react-native-worklets` as outdated. Leave them. The pinned versions match the
native libraries inside the installed Expo Go build; raising them to the versions
the Expo SDK lists segfaults the JS thread on launch. Change them only together
with the Expo Go build you develop against, and clear the Metro cache with
`bunx expo start --clear` afterwards, since the worklets Babel plugin version is
baked into the transform cache.

Bun is the only package manager and runtime. There is no npm lockfile and no
Node version file; `.bun-version` pins the toolchain for CI.

## Conventions

- Imports inside `core` and `server` use explicit `.js` extensions; both are `NodeNext` ESM.
- Ids carry a table prefix: `sub_`, `tch_`, `sec_`, `ent_`, `not_`. Zod enforces the shape.
- The app reads its API base from `EXPO_PUBLIC_API_URL`, falling back to `extra.apiUrl`
  in `mobile/app.json`. Override it for a session with
  `EXPO_PUBLIC_API_URL=http://localhost:4000 bun start`. Release builds take it from the
  `API_URL` repository variable, so the domain can move without a code change.
- The API answers nothing but `/api/health` without the shared `ACCESS_CODE`, sent by the
  app as an `x-kaksha-code` header. The server refuses to start without it. Devices are
  given the code once by hand; it is never built into the app, because the APK is
  published publicly.
- `ALLOWED_HOSTS` is an optional comma separated allowlist. When set, requests arriving on
  any other hostname get a 404, which is how the `*.vercel.app` URLs are closed off. Check
  what the server actually sees with `curl .../api/health` before setting it.
- Anything crossing a boundary, whether a database row, a query parameter or a request body, is parsed by a Zod schema first.
