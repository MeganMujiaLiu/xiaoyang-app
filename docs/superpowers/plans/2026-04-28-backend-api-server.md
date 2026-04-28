# Backend API Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js + Express backend that proxies iFlytek pronunciation scoring, serves episode metadata, and delivers subtitle data from Alibaba Cloud OSS — removing API credentials and bundled content from the app.

**Architecture:** An Express server lives in `server/` inside the same repo. It exposes three routes: GET /api/videos (episode list with CDN URLs), GET /api/subtitles/:id (subtitle JSON fetched from OSS), and POST /api/score (iFlytek proxy). The frontend's three service files are updated to call the backend instead of local data or iFlytek directly. Video files stream directly from CDN to the app — they never pass through the server.

**Tech Stack:** Node.js 18+, Express, cors, dotenv, ali-oss, axios, Jest, supertest (server); uni.request replacing local imports (frontend)

---

## File Structure

**Backend — new `server/` directory:**
- `server/package.json` — dependencies and scripts
- `server/.env.example` — documented env var template
- `server/index.js` — Express app entry, middleware, route mounting
- `server/routes/videos.js` — GET /api/videos
- `server/routes/subtitles.js` — GET /api/subtitles/:id
- `server/routes/score.js` — POST /api/score
- `server/services/oss.js` — ali-oss wrapper for subtitle JSON
- `server/services/iflytek.js` — iFlytek HTTP proxy (credentials from env)
- `server/data/subtitles/xiyouji-ep1.json` — subtitle data as JSON for OSS upload
- `server/__tests__/health.test.js`
- `server/__tests__/videos.test.js`
- `server/__tests__/subtitles.test.js`
- `server/__tests__/score.test.js`
- `server/__tests__/oss.test.js`
- `server/__tests__/iflytek.test.js`

**Frontend — modify existing files:**
- `services/config.js` (new) — API_BASE constant
- `services/videoService.js` — replace local imports with uni.request calls
- `services/iflytekService.js` — replace direct iFlytek call with /api/score call
- `utils/__tests__/videoService.test.js` — rewrite to mock uni.request
- `utils/__tests__/iflytekService.test.js` (new) — test updated service

---

### Task 1: Server Scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/index.js`
- Create: `server/__tests__/health.test.js`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "xiaoyang-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "ali-oss": "^6.20.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.0"
  }
}
```

- [ ] **Step 2: Create server/.env.example**

```
IFLYTEK_APPID=your_appid_here
IFLYTEK_API_KEY=your_api_key_here
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your-bucket-name
CDN_BASE_URL=https://cdn.yourdomain.com
PORT=3000
```

- [ ] **Step 3: Write the failing test**

```js
// server/__tests__/health.test.js
const request = require('supertest')
const app = require('../index')

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd server && npm install && npx jest __tests__/health.test.js --no-coverage
```
Expected: FAIL — "Cannot find module '../index'"

- [ ] **Step 5: Create server/index.js**

```js
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

module.exports = app

if (require.main === module) {
  const port = process.env.PORT || 3000
  app.listen(port, () => console.log(`Server running on port ${port}`))
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd server && npx jest __tests__/health.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/ && git commit -m "feat: scaffold Express server with health endpoint"
```

---

### Task 2: Videos Route

**Files:**
- Create: `server/routes/videos.js`
- Modify: `server/index.js` (add route mount)
- Create: `server/__tests__/videos.test.js`

- [ ] **Step 1: Write the failing test**

```js
// server/__tests__/videos.test.js
process.env.CDN_BASE_URL = 'https://test-cdn.example.com'
const request = require('supertest')
const app = require('../index')

describe('GET /api/videos', () => {
  it('returns 200 with episode array', async () => {
    const res = await request(app).get('/api/videos')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('each episode has required fields with CDN video URL', async () => {
    const res = await request(app).get('/api/videos')
    const ep = res.body[0]
    expect(ep).toMatchObject({
      id: expect.any(String),
      series: expect.any(String),
      episode: expect.any(Number),
      title: expect.any(String),
      duration: expect.any(Number),
      videoUrl: expect.stringContaining('xiyouji-ep1.mp4')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest __tests__/videos.test.js --no-coverage
```
Expected: FAIL — 404

- [ ] **Step 3: Create server/routes/videos.js**

```js
const express = require('express')
const router = express.Router()

const CDN_BASE = process.env.CDN_BASE_URL || ''

const EPISODES = [
  {
    id: 'xiyouji-ep1',
    series: '西游记',
    episode: 1,
    title: '第1集',
    duration: 0,
    videoUrl: `${CDN_BASE}/videos/xiyouji-ep1.mp4`
  }
]

router.get('/', (_req, res) => res.json(EPISODES))

module.exports = router
```

- [ ] **Step 4: Mount route in server/index.js**

Add after `app.get('/health', ...)`:
```js
const videosRouter = require('./routes/videos')
app.use('/api/videos', videosRouter)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd server && npx jest __tests__/videos.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/ && git commit -m "feat: add GET /api/videos route"
```

---

### Task 3: OSS Service

**Files:**
- Create: `server/data/subtitles/xiyouji-ep1.json`
- Create: `server/services/oss.js`
- Create: `server/__tests__/oss.test.js`

- [ ] **Step 1: Create server/data/subtitles/xiyouji-ep1.json**

This is the subtitle data file to upload to OSS. Replace with real 西游记 ep1 content when available.

```json
[
  { "index": 1, "startTime": 1000,  "endTime": 4500,  "english": "Peppa likes to look after her little brother, George.", "chinese": "佩奇喜欢照顾她的弟弟乔治" },
  { "index": 2, "startTime": 4600,  "endTime": 5800,  "english": "George,", "chinese": "好了乔治" },
  { "index": 3, "startTime": 5900,  "endTime": 8200,  "english": "let's find some more puddles.", "chinese": "我们再去找几个泥坑跳吧" },
  { "index": 4, "startTime": 8300,  "endTime": 11000, "english": "Peppa and George are having a lot of fun.", "chinese": "佩奇和乔治玩得很开心" },
  { "index": 5, "startTime": 11100, "endTime": 13500, "english": "Peppa has found a little puddle.", "chinese": "佩奇找到了一个小泥坑" },
  { "index": 6, "startTime": 13600, "endTime": 16200, "english": "George has found a bigger puddle.", "chinese": "乔治找到了一个更大的泥坑" },
  { "index": 7, "startTime": 16300, "endTime": 18800, "english": "Daddy Pig has found an enormous puddle.", "chinese": "猪爸爸找到了一个超大的泥坑" },
  { "index": 8, "startTime": 18900, "endTime": 21500, "english": "Daddy Pig loves jumping in muddy puddles.", "chinese": "猪爸爸超喜欢在泥坑里跳" }
]
```

- [ ] **Step 2: Write the failing test**

```js
// server/__tests__/oss.test.js
const mockGet = jest.fn()
jest.mock('ali-oss', () => jest.fn().mockImplementation(() => ({ get: mockGet })))

const { getSubtitleLines } = require('../services/oss')

describe('getSubtitleLines', () => {
  it('fetches and parses subtitle JSON from OSS', async () => {
    const lines = [{ index: 1, startTime: 1000, endTime: 4500, english: 'Hello', chinese: '你好' }]
    mockGet.mockResolvedValue({ content: Buffer.from(JSON.stringify(lines)) })

    const result = await getSubtitleLines('xiyouji-ep1')

    expect(mockGet).toHaveBeenCalledWith('subtitles/xiyouji-ep1.json')
    expect(result).toEqual(lines)
  })

  it('throws when OSS get fails', async () => {
    mockGet.mockRejectedValue(new Error('OSS error'))
    await expect(getSubtitleLines('xiyouji-ep1')).rejects.toThrow('OSS error')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd server && npx jest __tests__/oss.test.js --no-coverage
```
Expected: FAIL — "Cannot find module '../services/oss'"

- [ ] **Step 4: Create server/services/oss.js**

```js
const OSS = require('ali-oss')

const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
})

async function getSubtitleLines(episodeId) {
  const result = await client.get(`subtitles/${episodeId}.json`)
  return JSON.parse(result.content.toString())
}

module.exports = { getSubtitleLines }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd server && npx jest __tests__/oss.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/ && git commit -m "feat: add OSS service for subtitle JSON"
```

---

### Task 4: Subtitles Route

**Files:**
- Create: `server/routes/subtitles.js`
- Modify: `server/index.js` (add route mount)
- Create: `server/__tests__/subtitles.test.js`

- [ ] **Step 1: Write the failing test**

```js
// server/__tests__/subtitles.test.js
jest.mock('../services/oss', () => ({ getSubtitleLines: jest.fn() }))

const ossService = require('../services/oss')
const request = require('supertest')
const app = require('../index')

const MOCK_LINES = [
  { index: 1, startTime: 1000, endTime: 4500, english: 'Hello', chinese: '你好' }
]

describe('GET /api/subtitles/:id', () => {
  it('returns 200 with subtitle array', async () => {
    ossService.getSubtitleLines.mockResolvedValue(MOCK_LINES)
    const res = await request(app).get('/api/subtitles/xiyouji-ep1')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(MOCK_LINES)
  })

  it('returns 404 when OSS throws', async () => {
    ossService.getSubtitleLines.mockRejectedValue(new Error('Not found'))
    const res = await request(app).get('/api/subtitles/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: expect.any(String) })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest __tests__/subtitles.test.js --no-coverage
```
Expected: FAIL — 404

- [ ] **Step 3: Create server/routes/subtitles.js**

```js
const express = require('express')
const router = express.Router()
const { getSubtitleLines } = require('../services/oss')

router.get('/:id', async (req, res) => {
  try {
    const lines = await getSubtitleLines(req.params.id)
    res.json(lines)
  } catch {
    res.status(404).json({ error: `Subtitles not found: ${req.params.id}` })
  }
})

module.exports = router
```

- [ ] **Step 4: Mount route in server/index.js**

Add after the videos router line:
```js
const subtitlesRouter = require('./routes/subtitles')
app.use('/api/subtitles', subtitlesRouter)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd server && npx jest __tests__/subtitles.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/ && git commit -m "feat: add GET /api/subtitles/:id route"
```

---

### Task 5: iFlytek Server Service

**Files:**
- Create: `server/services/iflytek.js`
- Create: `server/__tests__/iflytek.test.js`

- [ ] **Step 1: Write the failing test**

```js
// server/__tests__/iflytek.test.js
jest.mock('axios')
const axios = require('axios')
const { scorePronunciation } = require('../services/iflytek')

describe('scorePronunciation', () => {
  beforeEach(() => {
    process.env.IFLYTEK_APPID = 'test-appid'
    process.env.IFLYTEK_API_KEY = 'test-key'
  })

  it('calls iFlytek API and returns rounded score', async () => {
    const xml = '<result total_score="82.5"></result>'
    const base64Xml = Buffer.from(xml).toString('base64')
    axios.post.mockResolvedValue({
      data: { payload: { result: { text: base64Xml } } }
    })

    const score = await scorePronunciation('base64audio', 'Hello world')

    expect(score).toBe(83)
    expect(axios.post).toHaveBeenCalledWith(
      'https://ise-api.xfyun.cn/v2/open-ise',
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Appid': 'test-appid' })
      })
    )
  })

  it('throws when response has no total_score', async () => {
    const base64Xml = Buffer.from('<result></result>').toString('base64')
    axios.post.mockResolvedValue({
      data: { payload: { result: { text: base64Xml } } }
    })
    await expect(scorePronunciation('audio', 'text')).rejects.toThrow('No total_score')
  })

  it('throws when axios call fails', async () => {
    axios.post.mockRejectedValue(new Error('network error'))
    await expect(scorePronunciation('audio', 'text')).rejects.toThrow('network error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest __tests__/iflytek.test.js --no-coverage
```
Expected: FAIL — "Cannot find module '../services/iflytek'"

- [ ] **Step 3: Create server/services/iflytek.js**

```js
const axios = require('axios')
const crypto = require('crypto')
const querystring = require('querystring')

async function scorePronunciation(base64Audio, referenceText) {
  const appid = process.env.IFLYTEK_APPID
  const apiKey = process.env.IFLYTEK_API_KEY
  const curTime = String(Math.floor(Date.now() / 1000))

  const paramStr = JSON.stringify({
    auf: 'audio/L16;rate=16000',
    aue: 'lame',
    tte: 'utf8',
    ent: 'en_us-ise',
    category: 'read_sentence'
  })
  const paramBase64 = Buffer.from(paramStr).toString('base64')
  const checksum = crypto.createHash('md5').update(apiKey + curTime + paramBase64).digest('hex')

  const body = querystring.stringify({
    auf: 'audio/L16;rate=16000',
    aue: 'lame',
    engine_type: 'en_us-ise',
    text: referenceText,
    audio: base64Audio
  })

  const response = await axios.post('https://ise-api.xfyun.cn/v2/open-ise', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Appid': appid,
      'X-CurTime': curTime,
      'X-Param': paramBase64,
      'X-CheckSum': checksum
    }
  })

  return extractScore(response.data)
}

function extractScore(responseData) {
  const resultText = responseData?.payload?.result?.text
  if (!resultText) throw new Error('No result text in response')
  const xml = Buffer.from(resultText, 'base64').toString()
  const match = xml.match(/total_score="([\d.]+)"/)
  if (!match) throw new Error('No total_score in XML result')
  return Math.round(parseFloat(match[1]))
}

module.exports = { scorePronunciation }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest __tests__/iflytek.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/ && git commit -m "feat: add server-side iFlytek scoring service"
```

---

### Task 6: Score Route

**Files:**
- Create: `server/routes/score.js`
- Modify: `server/index.js` (add route mount)
- Create: `server/__tests__/score.test.js`

- [ ] **Step 1: Write the failing test**

```js
// server/__tests__/score.test.js
jest.mock('../services/iflytek', () => ({ scorePronunciation: jest.fn() }))

const iflytekService = require('../services/iflytek')
const request = require('supertest')
const app = require('../index')

describe('POST /api/score', () => {
  it('returns 200 with score', async () => {
    iflytekService.scorePronunciation.mockResolvedValue(82)
    const res = await request(app)
      .post('/api/score')
      .send({ audio: 'base64audio', text: 'Hello world' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ score: 82 })
  })

  it('returns 400 when audio is missing', async () => {
    const res = await request(app).post('/api/score').send({ text: 'Hello' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/score').send({ audio: 'base64audio' })
    expect(res.status).toBe(400)
  })

  it('returns 502 when iFlytek service throws', async () => {
    iflytekService.scorePronunciation.mockRejectedValue(new Error('iFlytek error'))
    const res = await request(app)
      .post('/api/score')
      .send({ audio: 'base64audio', text: 'Hello world' })
    expect(res.status).toBe(502)
    expect(res.body).toMatchObject({ error: expect.any(String) })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest __tests__/score.test.js --no-coverage
```
Expected: FAIL — 404

- [ ] **Step 3: Create server/routes/score.js**

```js
const express = require('express')
const router = express.Router()
const { scorePronunciation } = require('../services/iflytek')

router.post('/', async (req, res) => {
  const { audio, text } = req.body
  if (!audio || !text) {
    return res.status(400).json({ error: 'audio and text are required' })
  }
  try {
    const score = await scorePronunciation(audio, text)
    res.json({ score })
  } catch (e) {
    res.status(502).json({ error: e.message || 'Scoring failed' })
  }
})

module.exports = router
```

- [ ] **Step 4: Mount route in server/index.js**

Add after the subtitles router line:
```js
const scoreRouter = require('./routes/score')
app.use('/api/score', scoreRouter)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd server && npx jest __tests__/score.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 6: Run all server tests**

```bash
cd server && npx jest --no-coverage
```
Expected: All tests PASS (health, videos, oss, subtitles, iflytek, score)

- [ ] **Step 7: Commit**

```bash
git add server/ && git commit -m "feat: add POST /api/score route — iFlytek proxy complete"
```

---

### Task 7: Frontend Config

**Files:**
- Create: `services/config.js`

- [ ] **Step 1: Create services/config.js**

```js
// Change to your server URL before building for production
export const API_BASE = 'http://localhost:3000'
```

- [ ] **Step 2: Commit**

```bash
git add services/config.js && git commit -m "feat: add frontend API base URL config"
```

---

### Task 8: Frontend videoService Update

**Files:**
- Modify: `services/videoService.js`
- Modify: `utils/__tests__/videoService.test.js`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `utils/__tests__/videoService.test.js`:

```js
jest.mock('../../services/config', () => ({ API_BASE: 'http://localhost:3000' }))

global.uni = { request: jest.fn() }

const { getVideos, getSubtitleLines } = require('../../services/videoService')

beforeEach(() => uni.request.mockReset())

describe('getVideos', () => {
  it('calls GET /api/videos and returns data', async () => {
    const mockVideos = [{ id: 'xiyouji-ep1', series: '西游记', episode: 1 }]
    uni.request.mockImplementation(({ success }) => success({ data: mockVideos }))

    const result = await getVideos()

    expect(uni.request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://localhost:3000/api/videos'
    }))
    expect(result).toEqual(mockVideos)
  })

  it('rejects on request failure', async () => {
    uni.request.mockImplementation(({ fail }) => fail({ errMsg: 'network error' }))
    await expect(getVideos()).rejects.toThrow('network error')
  })
})

describe('getSubtitleLines', () => {
  it('calls GET /api/subtitles/:id and returns data', async () => {
    const mockLines = [{ index: 1, startTime: 1000, endTime: 4500, english: 'Hello', chinese: '你好' }]
    uni.request.mockImplementation(({ success }) => success({ data: mockLines }))

    const result = await getSubtitleLines('xiyouji-ep1')

    expect(uni.request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://localhost:3000/api/subtitles/xiyouji-ep1'
    }))
    expect(result).toEqual(mockLines)
  })

  it('rejects on request failure', async () => {
    uni.request.mockImplementation(({ fail }) => fail({ errMsg: 'timeout' }))
    await expect(getSubtitleLines('xiyouji-ep1')).rejects.toThrow('timeout')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=videoService --no-coverage
```
Expected: FAIL — existing implementation imports local data, not uni.request

- [ ] **Step 3: Replace services/videoService.js**

```js
import { API_BASE } from './config.js'

export async function getVideos() {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/videos`,
      success: res => resolve(res.data),
      fail: e => reject(new Error(e.errMsg || 'Failed to fetch videos'))
    })
  })
}

export async function getSubtitleLines(episodeId) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/subtitles/${episodeId}`,
      success: res => resolve(res.data),
      fail: e => reject(new Error(e.errMsg || 'Failed to fetch subtitles'))
    })
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=videoService --no-coverage
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add services/videoService.js utils/__tests__/videoService.test.js && git commit -m "feat: update videoService to fetch from backend API"
```

---

### Task 9: Frontend iflytekService Update

**Files:**
- Modify: `services/iflytekService.js`
- Create: `utils/__tests__/iflytekService.test.js`

- [ ] **Step 1: Write the failing test**

```js
// utils/__tests__/iflytekService.test.js
jest.mock('../../services/config', () => ({ API_BASE: 'http://localhost:3000' }))

const mockReadFile = jest.fn()
global.uni = {
  request: jest.fn(),
  getFileSystemManager: jest.fn(() => ({ readFile: mockReadFile }))
}

const { scorePronunciation } = require('../../services/iflytekService')

beforeEach(() => {
  uni.request.mockReset()
  mockReadFile.mockReset()
})

describe('scorePronunciation', () => {
  it('reads audio as base64 then posts to /api/score', async () => {
    mockReadFile.mockImplementation(({ success }) => success({ data: 'base64audio' }))
    uni.request.mockImplementation(({ success }) => success({ data: { score: 82 } }))

    const score = await scorePronunciation('/tmp/audio.mp3', 'Hello world')

    expect(uni.request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://localhost:3000/api/score',
      method: 'POST',
      data: { audio: 'base64audio', text: 'Hello world' }
    }))
    expect(score).toBe(82)
  })

  it('rejects when file read fails', async () => {
    mockReadFile.mockImplementation(({ fail }) => fail({ errMsg: 'file not found' }))
    await expect(scorePronunciation('/bad/path', 'text')).rejects.toThrow('file not found')
  })

  it('rejects when server request fails', async () => {
    mockReadFile.mockImplementation(({ success }) => success({ data: 'base64audio' }))
    uni.request.mockImplementation(({ fail }) => fail({ errMsg: 'timeout' }))
    await expect(scorePronunciation('/tmp/audio.mp3', 'Hello')).rejects.toThrow('timeout')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=iflytekService --no-coverage
```
Expected: FAIL — "Cannot find module '../../services/iflytekService'"

- [ ] **Step 3: Replace services/iflytekService.js**

```js
import { API_BASE } from './config.js'

export async function scorePronunciation(audioFilePath, referenceText) {
  const base64Audio = await readFileAsBase64(audioFilePath)
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/score`,
      method: 'POST',
      data: { audio: base64Audio, text: referenceText },
      success: res => resolve(res.data.score),
      fail: e => reject(new Error(e.errMsg || 'Scoring request failed'))
    })
  })
}

function readFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: res => resolve(res.data),
      fail: e => reject(new Error(e.errMsg))
    })
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=iflytekService --no-coverage
```
Expected: PASS (3 tests)

- [ ] **Step 5: Run all frontend tests**

```bash
npm test -- --no-coverage
```
Expected: All tests PASS (parseSrt suite + videoService suite + iflytekService suite)

- [ ] **Step 6: Commit**

```bash
git add services/iflytekService.js utils/__tests__/iflytekService.test.js && git commit -m "feat: update iflytekService to proxy through backend — credentials off client"
```
