# Secure MegaNodes launcher backend

This backend is required because a Surge static site cannot hide the MegaNodes API token.

## Cloudflare Worker deployment

1. Install Wrangler:

```bash
npm i -g wrangler
```

2. Create a Worker project or copy `cloudflare-worker.js` into an existing Worker.

3. Add secrets:

```bash
wrangler secret put MEGANODES_API_TOKEN
wrangler secret put ALLOWED_ORIGIN
```

- `MEGANODES_API_TOKEN`: your token from MegaNodes → API → Main API / My Settings.
- `ALLOWED_ORIGIN`: your site origin, e.g. `https://poseidon-casino-kamel.surge.sh`.

4. Deploy:

```bash
wrangler deploy cloudflare-worker.js --name poseidon-meganodes-launcher
```

5. Copy the Worker URL and put it in `../meganodes-config.js`:

```js
window.POSEIDON_CONFIG = {
  launchEndpoint: "https://poseidon-meganodes-launcher.YOUR.workers.dev/launch-game",
  language: "en",
  returnUrl: window.location.origin + "/casino.html"
};
```

## Important production note

The demo Worker accepts `user_code` from the browser for testing. For production, do **not** trust that value from the client. Your backend should authenticate the player and look up the correct MegaNodes `user_code` server-side.
