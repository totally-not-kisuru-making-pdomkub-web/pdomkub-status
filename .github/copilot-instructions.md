# Copilot instructions

## Project layout and runtime

- The application lives under `app/`; run all Bun commands from that directory.
- `app/src/index.ts` is the only server entry point. It loads `app/src/web/index.html`, creates an Elysia server, serves the page at `/`, and exposes service status data at `/api/services`.
- The page is plain HTML, CSS, and browser JavaScript in `app/src/web/index.html`. It fetches `/api/services` on load and every 30 seconds, then renders the returned services and timestamp.
- Service definitions are centralized in the `services` array in `app/src/index.ts`. HTTP services use `fetch` (optionally with `HEAD`); the Minecraft/Bedrock service uses a UDP socket and a short timeout. Keep the response status vocabulary as `"operational"` or `"down"` because the page maps those values directly to its display.
- The server listens on port `3000`. The HTML is read synchronously at startup, so changes to the page require restarting the server when not using the Bun watcher.
- The Cloudflare Worker entry point is `app/src/worker.ts`, configured by `app/wrangler.toml`. It imports the HTML as a text asset, serves `/` and `/api/services`, and performs HTTP probes with the Workers `fetch` API.
- The Worker cannot open arbitrary UDP sockets. Its Minecraft/Bedrock check therefore uses the external MCStatus Bedrock API with the configured host and port, and only returns `"operational"` when the API confirms `online: true`.

## Commands

Run these from `app/`:

```bash
# Install locked dependencies
bun install --frozen-lockfile

# Start the development server with file watching
bun run dev

# Run the Cloudflare Worker locally
bun run cf:dev

# Deploy the Worker
bun run cf:deploy

# Type-check without emitting JavaScript (currently incompatible with the checked-in tsconfig)
bunx tsc --noEmit
```

There is currently no passing test suite, single-test command, build script, or lint script. `package.json` contains a placeholder `test` script that exits with an error, so do not treat `bun test` or `bun run test` as project validation until tests are added. `bunx tsc --noEmit` currently fails because the latest TypeScript no longer accepts the `moduleResolution` default in the checked-in `tsconfig.json`; resolve that configuration/version mismatch before relying on type-checking. For a focused local check, use `bun run cf:dev` and request `http://localhost:8787/` or `http://localhost:8787/api/services`; for production checks, use the URL printed by `bun run cf:deploy`.

## Implementation conventions

- Keep the local Bun server in `src/index.ts` separate from the Worker handler in `src/worker.ts`; Worker code must use Web APIs and must not import Node-only modules such as `fs`, `path`, or `dgram`.
- Add or change monitored services in the shared `services` configuration, rather than duplicating service metadata inside route handlers or the HTML.
- Keep service probing in helper functions (`checkServiceStatus` and `checkGameServerStatus`) and return the established status union. The Bedrock helper must preserve the configured host and port in its MCStatus request. Probe failures are represented as `"down"` so `/api/services` can return a complete result for every configured service.
- The API response shape is `{ services: Array<{ name, status }>, timestamp }`; update both server and browser code together if this contract changes.
- TypeScript is strict and targets ES2021. Avoid weakening the compiler settings or introducing broad type assertions; replace the current `any` service annotation with an explicit discriminated type when extending the service model.
- Keep the frontend dependency-free and colocated in `src/web/index.html` unless the project is intentionally migrated to a build step.
- When browser automation is available, prefer Playwright for checking the rendered status page and its polling behavior; keep those checks separate from the server's protocol-probing logic.
