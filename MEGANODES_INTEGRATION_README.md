# MegaNodes integration for existing `dist/` site

ركّبت الألعاب في نفس ملفات الموقع الموجودة في repository، موش موقع جديد.

## الملفات اللي تبدّلت / تزادت

داخل `dist/`:

- `casino_inject.js` — يقرأ MegaNodes catalog ويحقن الألعاب داخل نفس صفحة Casino/Live Casino.
- `casino.html` — تزاد script `meganodes-config.js`.
- `live-casino.html` — تزاد scripts `meganodes-config.js` و `casino_inject.js`.
- `meganodes_games.json` — 1875 لعبة من MegaNodes.
- `meganodes_games.csv` — CSV للقائمة.
- `meganodes-config.js` — فيه Render backend URL، لا يحتوي API token.
- `game-launch.html` — يفتح اللعبة عبر Render backend داخل iframe.

Backend:

- `backend/render/server.js` — Node/Express backend جاهز لـ Render.
- `backend/render/package.json` — تشغيل Render.
- `render.yaml` — Render Blueprint.

## الأرقام

- Total games: 1875
- Slots: 1535
- Live: 340
- Providers: 10

## Render backend

Service name المقترح:

```text
poseidon-meganodes-backend
```

URL المتوقع:

```text
https://poseidon-meganodes-backend.onrender.com
```

الـ frontend مضبوط في:

```js
// dist/meganodes-config.js
launchEndpoint: "https://poseidon-meganodes-backend.onrender.com/launch-game"
```

إذا Render أعطاك URL مختلف، بدّلو فقط في `dist/meganodes-config.js`.

## Environment variables على Render

Required:

```text
MEGANODES_API_TOKEN=token from MegaNodes Main API
ALLOWED_ORIGINS=https://poseidon-casino-kamel.surge.sh
```

Optional:

```text
REQUIRE_AUTH=false
AUTO_CREATE_USERS=true
MEGANODES_INITIAL_DEPOSIT=0
DATA_DIR=/tmp/poseidon-meganodes
```

## Deploy Surge

بعد ما backend يخدم، deploy نفس dist:

```bash
npx surge dist --domain poseidon-casino-kamel.surge.sh
```

## ملاحظات مهمة

- ما حطّيتش MegaNodes token في `dist/` خاطر public.
- الضغط على Play ينادي Render backend، والـ backend ينادي MegaNodes `/game/game-url`.
- backend يعمل auto-create لمستخدم MegaNodes بالـ anonymous browser ID إذا login غير مربوط. للإنتاج، الأفضل تفعّل Supabase auth verification لاحقاً.
