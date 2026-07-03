# Poseidon MegaNodes backend on Render

This is the secure backend required by the Surge static site.
It hides `MEGANODES_API_TOKEN` and connects the site to MegaNodes:

- `GET /api/providers`
- `GET /api/games?provider_code=1`
- `POST /user/link`
- `POST /launch-game`

## Render environment variables

Required:

```text
MEGANODES_API_TOKEN=your MegaNodes Main API token
ALLOWED_ORIGINS=https://poseidon-casino-kamel.surge.sh
```

Optional:

```text
REQUIRE_AUTH=false
AUTO_CREATE_USERS=true
SUPABASE_URL=https://ynsjeihnqixqvkyzzpsz.supabase.co
SUPABASE_ANON_KEY=your supabase anon key if you want verified Supabase sessions
DATA_DIR=/tmp/poseidon-meganodes
MEGANODES_INITIAL_DEPOSIT=0
```

## Notes

- If `REQUIRE_AUTH=false`, the site sends an anonymous browser ID and the backend auto-creates a MegaNodes user for that browser.
- If `REQUIRE_AUTH=true`, the browser must send a Supabase access token. The backend verifies it and maps that Supabase user to a MegaNodes user.
- `MEGANODES_INITIAL_DEPOSIT` debits the agent balance. Keep it `0` unless you intentionally want to give every new user starting points.

## Local run

```bash
cd backend/render
cp .env.example .env
npm install
npm start
```
