# Running and publishing the game

Run `npm ci` and `npm run dev` for local play. Run `npm test`, `npm run lint` and `npm run build` before publishing. The integrated production build writes the chase to the parent app’s `public/chase`. The parent app builds it automatically with `npm run build`.

The hosted Supabase project reference is `epgfnifxzvapiiumzord`. Enable anonymous sign-ins in Authentication settings so players can post runs and download authenticated content. The game can read the public leaderboard and save personal bests locally.

For Vercel, import the repository as a Vite project. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project URL and publishable key for both Production and Preview. Vite reads them during the build. Git integration deploys pushes to main. For deployments through GitHub Actions instead, set repository variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and secret `VERCEL_TOKEN`.

The hosted functions validate the caller through Supabase Auth. To enable generated Cheshire commentary, put `LLM_API_KEY=...` in a private file outside the repository and run the following command with your own authenticated Supabase CLI. Replace the example path with the private file path.

```sh
supabase secrets set --env-file /path/to/private/server.env --project-ref epgfnifxzvapiiumzord
```

Without the key the game uses its built-in Cheshire lines. Carbon popups use example scenarios and EPA emissions factors. Ace medal times await timed playtests.
