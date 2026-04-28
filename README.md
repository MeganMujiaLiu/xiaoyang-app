# English Read-Along (小羊)

A uni-app mobile app for English reading practice with cartoon videos. Features bilingual subtitle sync, display modes, shadowing (line-by-line recording), and pronunciation scoring.

## Project Structure

```
├── pages/
│   ├── home/          — episode list
│   ├── player/        — video player with transcript
│   └── shadowing/     — record and score pronunciation
├── services/
│   ├── config.js      — API base URL (change before production build)
│   ├── videoService.js
│   ├── iflytekService.js
│   └── recordingService.js
├── data/
│   └── subtitles/     — subtitle JS files (used before backend is live)
├── static/
│   └── videos/        — local video files (used before backend is live)
└── server/            — Node.js backend (see Backend section below)
```

## Frontend

### Requirements

- [HBuilderX](https://www.dcloud.io/hbuilderx.html) — required to build and run uni-app projects
- A physical iOS or Android device (recommended) or simulator

### Run

1. Open HBuilderX
2. Open this project folder
3. Click **Run → Run to Phone or Emulator** and select your device

The app runs locally using files in `static/videos/` and `data/subtitles/`. No backend needed at this stage.

### Tests

```bash
npm install
npm test
```

---

## Backend

The backend proxies iFlytek pronunciation scoring and serves episode metadata and subtitle data from Alibaba Cloud OSS.

> **Status:** Not yet implemented. See `docs/superpowers/plans/2026-04-28-backend-api-server.md` for the implementation plan.

### Requirements

- Node.js 18+
- Alibaba Cloud account with OSS bucket and CDN configured
- iFlytek 讯飞 account — get credentials at [console.xfyun.cn](https://console.xfyun.cn)

### Setup

```bash
cd server
npm install
cp .env.example .env
# Fill in .env with your credentials
```

`.env` values:

| Key | Description |
|-----|-------------|
| `IFLYTEK_APPID` | iFlytek App ID from console.xfyun.cn |
| `IFLYTEK_API_KEY` | iFlytek API Key |
| `OSS_REGION` | e.g. `oss-cn-hangzhou` |
| `OSS_ACCESS_KEY_ID` | Alibaba Cloud access key |
| `OSS_ACCESS_KEY_SECRET` | Alibaba Cloud access key secret |
| `OSS_BUCKET` | Your OSS bucket name |
| `CDN_BASE_URL` | CDN domain in front of OSS, e.g. `https://cdn.yourdomain.com` |
| `PORT` | Server port, default `3000` |

### Run

```bash
cd server
npm run dev      # development (auto-restarts on file change)
npm start        # production
```

### Test

```bash
cd server
npm test
```

### Adding Episodes

1. Upload the video file to OSS at `videos/<id>.mp4`
2. Upload the subtitle JSON to OSS at `subtitles/<id>.json`
3. Add an entry to `server/routes/videos.js` EPISODES array
4. Update `services/config.js` `API_BASE` to point to your server

Subtitle JSON format:
```json
[
  { "index": 1, "startTime": 1000, "endTime": 4500, "english": "...", "chinese": "..." }
]
```
`startTime` and `endTime` are in milliseconds.

---

## iFlytek Pronunciation Scoring

Scoring requires real iFlytek credentials. Without them, the shadowing page records and plays back audio normally — scores are silently skipped.

To activate scoring before the backend is ready, fill in `APPID` and `API_KEY` directly in `services/iflytekService.js` and replace the `REPLACE_WITH_MD5` placeholder (see comments in that file). This is only for local testing — never ship credentials in the app bundle.

---

## Pending

See `docs/TODO.md` for non-code items (ICP license, Alibaba Cloud account, domain).
