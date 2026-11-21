# lib/solari: verified SDK surface

Sources: docs.getsolari.com (TypeScript SDK pages), solari-cookbook examples, and the installed
`.d.ts` files. Pinned: `@solarisdk/browser@0.5.5`, `@solarisdk/sandbox@0.4.15` (core 0.4.x comes with it).
All SDK method names live in this folder only. No SDK constructor reads `process.env`; `config.ts` does.

## Browser (`browser.ts`)
- `new Solari({ apiKey })` then `solari.launch({ recording })` returns a `BrowserSession` (`id`, `expiresAt`).
- `session.newPage()` returns a Playwright `Page` (screenshot, evaluate, locator are plain Playwright).
- `session.close()` releases the session. `solari.close()` is required or Node hangs.
- Replay: `solari.sessions.getReplayUrl(id)` returns `{ url, expiresInSeconds }`, ready about 1-3 s after release.
- NEVER pass `stealth`, `proxy`, or `captcha` (project rule; covered by a test).

## Sandbox (`sandbox.ts`)
- `new SandboxClient({ apiKey })`, `client.create({ template, idleTimeoutMs, metadata })`.
- `sandbox.commands.run(cmd, { args })` (not shell-interpreted), `sandbox.files.write(path, text)`.
- `sandbox.previewUrl(port)` returns `{ url, token? }`. The URL may carry a credential: do not log it.
- `sandbox.snapshot(name)` returns an id, `sandbox.revert(id)` restores in place, `sandbox.kill()` is idempotent.
- `idleTimeoutMs` is a rolling idle window, not a max lifetime (`timeoutMs` is deprecated).

## Cleanup
- Browser sessions: released in `finally`; they also auto-release at `expiresAt`.
- Sandboxes: tagged `app=rabbit-hole` + `createdAtMs`; `sweepOrphans()` kills tagged ones older than the TTL.
  Nothing calls the sweeper on a schedule yet (needs a cron or route).

## Not yet confirmed against the live API
- Whether `page.screenshot()` works on a Solari session (inferred from Playwright).
- Preview URL reachability from a Solari browser, and the 501 case when no preview domain is configured.
- Whether `python3` exists in the `base` template.
Run `GET /api/dev/solari-check` in dev to check all three.
