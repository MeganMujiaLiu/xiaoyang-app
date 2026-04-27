# Backend Architecture Design

## Goal

Move video content delivery, subtitle serving, and iFlytek pronunciation scoring from the frontend app to a backend server, so API credentials are never exposed in the app bundle and the app can support many episodes without growing in size.

## Architecture

Three components:

1. **API Server** — Node.js + Express on Alibaba Cloud ECS. Handles episode metadata, subtitle data, and iFlytek proxying.
2. **OSS + CDN** — Alibaba Cloud Object Storage for video files, with CDN in front for fast delivery to both mainland China and international users. Video streams directly from CDN to the app — never through the server.
3. **uni-app frontend** — calls the API for data; streams video directly from CDN URLs returned by the API.

```
uni-app
  ├── GET /api/videos         → API Server → returns episode list with CDN video URLs
  ├── GET /api/subtitles/:id  → API Server → fetches JSON from OSS, returns to app
  └── POST /api/score         → API Server → proxies to iFlytek → returns score

app streams video directly from CDN (not through server)
```

## Tech Stack

- **Server:** Node.js + Express
- **Hosting:** Alibaba Cloud ECS (single instance to start)
- **Storage:** Alibaba Cloud OSS
- **CDN:** Alibaba Cloud CDN in front of OSS
- **HTTPS:** Let's Encrypt (free)
- **Credentials:** stored in `.env` on the server, never committed

## API Endpoints

### `GET /api/videos`
Returns the episode list. Each entry includes a CDN URL for the video.

```json
[
  {
    "id": "xiyouji-ep1",
    "series": "西游记",
    "episode": 1,
    "title": "第1集",
    "duration": 1440,
    "videoUrl": "https://cdn.yourdomain.com/videos/xiyouji-ep1.mp4"
  }
]
```

Episode metadata is hardcoded in the server for now. Can be moved to a database when the episode count grows.

### `GET /api/subtitles/:episodeId`
Returns subtitle lines for an episode. Subtitle JSON files are stored in OSS and fetched by the server.

```json
[
  { "index": 1, "startTime": 1000, "endTime": 4500, "english": "...", "chinese": "..." }
]
```

### `POST /api/score`
Receives base64 audio and reference text from the app, proxies to iFlytek, returns the score. iFlytek credentials never leave the server.

Request:
```json
{ "audio": "<base64>", "text": "the sentence the user read" }
```

Response:
```json
{ "score": 82 }
```

## Backend Project Structure

Separate directory (`server/`) in the same repo:

```
server/
├── index.js
├── routes/
│   ├── videos.js
│   ├── subtitles.js
│   └── score.js
├── services/
│   └── iflytek.js
├── .env
└── package.json
```

## Frontend Changes

Only three files change. Pages are untouched.

**`services/config.js`** (new) — holds `API_BASE` URL, switchable between dev and prod.

**`services/videoService.js`** — replace local JS imports with `uni.request` calls to `/api/videos` and `/api/subtitles/:id`.

**`services/iflytekService.js`** — replace direct iFlytek call with `uni.request` POST to `/api/score`. The `readFileAsBase64` helper stays; the iFlytek credentials and HTTP logic move to the server.

## Out of Scope (Later Phases)

- User accounts and login
- Progress sync across devices
- Admin panel for content management
- Database for episode metadata
