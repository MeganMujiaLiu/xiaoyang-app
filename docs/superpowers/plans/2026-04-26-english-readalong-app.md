# English Read-Along App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a uni-app (HBuilderX) English cartoon read-along app with line-by-line subtitle sync, 4 display modes, and a shadowing practice page with pronunciation scoring.

**Architecture:** Three pages (home, player, shadowing) backed by a `videoService` data abstraction that reads local files now and can be swapped for server API calls without touching page code. A `parseSrt` utility handles subtitle parsing. Recording and playback are isolated in `recordingService`.

**Tech Stack:** uni-app + Vue 3 Composition API, HBuilderX, Jest (utility tests), iFlytek 讯飞 pronunciation evaluation API

---

## File Map

| File | Responsibility |
|---|---|
| `pages/home/index.vue` | Video grid list, tap to open player |
| `pages/player/index.vue` | Main read/listen experience |
| `pages/shadowing/index.vue` | Line-by-line shadowing practice |
| `utils/parseSrt.js` | Parses SRT string → `SubtitleLine[]` |
| `utils/__tests__/parseSrt.test.js` | Unit tests for parser |
| `utils/__tests__/videoService.test.js` | Unit tests for data service |
| `services/videoService.js` | Data access: videos + subtitles (local now, API later) |
| `services/recordingService.js` | Record and playback via uni-app APIs |
| `services/iflytekService.js` | Pronunciation scoring via iFlytek API |
| `data/videos.js` | Local video metadata list |
| `data/subtitles/peppa-muddy-puddles.js` | Sample subtitle data |
| `static/covers/` | Thumbnail images |
| `static/videos/` | Cartoon video files |
| `pages.json` | Route config for all 3 pages |
| `App.vue` | Global styles |

---

### Task 1: Create uni-app project and configure routing

**Files:**
- Create: `pages.json`
- Create: `App.vue`
- Create: `main.js`
- Create: `.gitignore`

- [ ] **Step 1: Create project in HBuilderX**

  In HBuilderX: **File → New → Project → uni-app** → select **Vue3** template → set location to `/Users/meganliu/xiaoyang` → name it (e.g. `readalong`).

  This generates: `main.js`, `App.vue`, `manifest.json`, `pages.json`, `pages/index/index.vue`, `static/`, `uni.scss`.

- [ ] **Step 2: Configure pages.json**

  Replace the generated `pages.json` with:

  ```json
  {
    "pages": [
      {
        "path": "pages/home/index",
        "style": {
          "navigationBarTitleText": "英语视频",
          "navigationBarBackgroundColor": "#ffffff",
          "navigationBarTextStyle": "black"
        }
      },
      {
        "path": "pages/player/index",
        "style": {
          "navigationBarTitleText": "",
          "navigationStyle": "custom"
        }
      },
      {
        "path": "pages/shadowing/index",
        "style": {
          "navigationBarTitleText": "语音跟读（练习）",
          "navigationBarBackgroundColor": "#ffffff",
          "navigationBarTextStyle": "black"
        }
      }
    ],
    "globalStyle": {
      "navigationBarTextStyle": "black",
      "navigationBarBackgroundColor": "#ffffff",
      "backgroundColor": "#f7f7f7"
    }
  }
  ```

- [ ] **Step 3: Create directories**

  ```bash
  mkdir -p pages/home pages/player pages/shadowing
  mkdir -p utils/__tests__ services data/subtitles static/covers static/videos
  ```

- [ ] **Step 4: Replace App.vue**

  ```vue
  <script>
  export default { onLaunch() {} }
  </script>

  <style>
  page {
    background-color: #f7f7f7;
    font-family: -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  }
  .safe-area-bottom {
    padding-bottom: constant(safe-area-inset-bottom);
    padding-bottom: env(safe-area-inset-bottom);
  }
  </style>
  ```

- [ ] **Step 5: Add .gitignore entries**

  Add to `.gitignore`:
  ```
  unpackage/
  node_modules/
  .superpowers/
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add pages.json App.vue main.js manifest.json .gitignore
  git commit -m "feat: scaffold uni-app project with 3-page routing"
  ```

---

### Task 2: Jest setup for utility testing

**Files:**
- Create: `package.json`
- Create: `jest.config.js`
- Create: `babel.config.js`

- [ ] **Step 1: Initialize and install**

  ```bash
  npm init -y
  npm install --save-dev jest @babel/core @babel/preset-env babel-jest
  ```

- [ ] **Step 2: Create jest.config.js**

  ```javascript
  module.exports = {
    testEnvironment: 'node',
    transform: { '^.+\\.js$': 'babel-jest' },
    testMatch: ['**/__tests__/**/*.test.js']
  }
  ```

- [ ] **Step 3: Create babel.config.js**

  ```javascript
  module.exports = {
    presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
  }
  ```

- [ ] **Step 4: Verify Jest runs**

  ```bash
  npx jest --listTests
  ```

  Expected: empty list, no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add package.json package-lock.json jest.config.js babel.config.js
  git commit -m "feat: add Jest for utility unit testing"
  ```

---

### Task 3: SRT parser utility

**Files:**
- Create: `utils/parseSrt.js`
- Create: `utils/__tests__/parseSrt.test.js`

- [ ] **Step 1: Write failing tests**

  Create `utils/__tests__/parseSrt.test.js`:

  ```javascript
  import { parseSrt } from '../parseSrt'

  describe('parseSrt', () => {
    it('parses a bilingual SRT block', () => {
      const srt = `1
  00:00:01,000 --> 00:00:03,500
  Peppa likes to look after her little brother, George.
  佩奇喜欢照顾她的弟弟乔治

  2
  00:00:04,000 --> 00:00:05,200
  George,
  好了乔治`
      const result = parseSrt(srt)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        index: 1,
        startTime: 1000,
        endTime: 3500,
        english: 'Peppa likes to look after her little brother, George.',
        chinese: '佩奇喜欢照顾她的弟弟乔治'
      })
      expect(result[1]).toEqual({
        index: 2,
        startTime: 4000,
        endTime: 5200,
        english: 'George,',
        chinese: '好了乔治'
      })
    })

    it('handles missing Chinese translation', () => {
      const srt = `1\n00:00:01,000 --> 00:00:02,000\nHello world`
      const result = parseSrt(srt)
      expect(result[0].english).toBe('Hello world')
      expect(result[0].chinese).toBe('')
    })

    it('parses timestamps with hours correctly', () => {
      const srt = `1\n01:33:52,861 --> 01:34:00,500\ntest\n测试`
      const result = parseSrt(srt)
      // 1h 33m 52s 861ms = (3600 + 33*60 + 52)*1000 + 861 = 5632861
      expect(result[0].startTime).toBe(5632861)
      // 1h 34m 0s 500ms = (3600 + 34*60 + 0)*1000 + 500 = 5640500
      expect(result[0].endTime).toBe(5640500)
    })

    it('handles Windows CRLF line endings', () => {
      const srt = "1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n世界\r\n\r\n"
      const result = parseSrt(srt)
      expect(result).toHaveLength(1)
      expect(result[0].english).toBe('Hello')
      expect(result[0].chinese).toBe('世界')
    })

    it('returns empty array for empty input', () => {
      expect(parseSrt('')).toEqual([])
      expect(parseSrt('   ')).toEqual([])
    })
  })
  ```

- [ ] **Step 2: Run to confirm failure**

  ```bash
  npx jest utils/__tests__/parseSrt.test.js --verbose
  ```

  Expected: FAIL — "Cannot find module '../parseSrt'"

- [ ] **Step 3: Implement parseSrt**

  Create `utils/parseSrt.js`:

  ```javascript
  export function parseSrt(content) {
    if (!content || !content.trim()) return []
    return content
      .trim()
      .split(/\r?\n\r?\n/)
      .map(block => {
        const lines = block.trim().split(/\r?\n/)
        if (lines.length < 2) return null
        const index = parseInt(lines[0])
        if (isNaN(index)) return null
        const parts = lines[1].split(' --> ')
        if (parts.length !== 2) return null
        return {
          index,
          startTime: parseTime(parts[0]),
          endTime: parseTime(parts[1]),
          english: lines[2] || '',
          chinese: lines[3] || ''
        }
      })
      .filter(Boolean)
  }

  function parseTime(str) {
    const [hms, ms] = str.trim().split(',')
    const [h, m, s] = hms.split(':').map(Number)
    return (h * 3600 + m * 60 + s) * 1000 + parseInt(ms)
  }
  ```

- [ ] **Step 4: Run to confirm passing**

  ```bash
  npx jest utils/__tests__/parseSrt.test.js --verbose
  ```

  Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

  ```bash
  git add utils/parseSrt.js utils/__tests__/parseSrt.test.js
  git commit -m "feat: add SRT parser utility with tests"
  ```

---

### Task 4: Video data and service layer

**Files:**
- Create: `data/videos.js`
- Create: `data/subtitles/peppa-muddy-puddles.js`
- Create: `services/videoService.js`
- Create: `utils/__tests__/videoService.test.js`

- [ ] **Step 1: Create video metadata**

  Create `data/videos.js`:

  ```javascript
  export const VIDEOS = [
    {
      id: 'peppa-muddy-puddles',
      title: 'Muddy Puddles',
      coverImage: '/static/covers/peppa-muddy-puddles.jpg',
      videoUrl: '/static/videos/peppa-muddy-puddles.mp4',
      subtitleId: 'peppa-muddy-puddles',
      duration: 302
    }
  ]
  ```

- [ ] **Step 2: Create sample subtitle data**

  Create `data/subtitles/peppa-muddy-puddles.js`:

  ```javascript
  // Pre-parsed subtitle lines for Peppa Pig - Muddy Puddles
  // { index, startTime (ms), endTime (ms), english, chinese }
  export default [
    { index: 1, startTime: 1000,  endTime: 4500,  english: "Peppa likes to look after her little brother, George.", chinese: "佩奇喜欢照顾她的弟弟乔治" },
    { index: 2, startTime: 4600,  endTime: 5800,  english: "George,", chinese: "好了乔治" },
    { index: 3, startTime: 5900,  endTime: 8200,  english: "let's find some more puddles.", chinese: "我们再去找几个泥坑跳吧" },
    { index: 4, startTime: 8300,  endTime: 11000, english: "Peppa and George are having a lot of fun.", chinese: "佩奇和乔治玩得很开心" },
    { index: 5, startTime: 11100, endTime: 13500, english: "Peppa has found a little puddle.", chinese: "佩奇找到了一个小泥坑" },
    { index: 6, startTime: 13600, endTime: 16200, english: "George has found a bigger puddle.", chinese: "乔治找到了一个更大的泥坑" },
    { index: 7, startTime: 16300, endTime: 18800, english: "Daddy Pig has found an enormous puddle.", chinese: "猪爸爸找到了一个超大的泥坑" },
    { index: 8, startTime: 18900, endTime: 21500, english: "Daddy Pig loves jumping in muddy puddles.", chinese: "猪爸爸超喜欢在泥坑里跳" }
  ]
  ```

- [ ] **Step 3: Write failing tests for videoService**

  Create `utils/__tests__/videoService.test.js`:

  ```javascript
  import { getVideos, getSubtitleLines } from '../../services/videoService'

  describe('videoService', () => {
    it('returns a non-empty list of videos', async () => {
      const videos = await getVideos()
      expect(videos.length).toBeGreaterThan(0)
      expect(videos[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        videoUrl: expect.any(String),
        subtitleId: expect.any(String),
        duration: expect.any(Number)
      })
    })

    it('returns subtitle lines for a valid subtitleId', async () => {
      const lines = await getSubtitleLines('peppa-muddy-puddles')
      expect(lines.length).toBeGreaterThan(0)
      expect(lines[0]).toMatchObject({
        index: expect.any(Number),
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        english: expect.any(String),
        chinese: expect.any(String)
      })
    })

    it('throws for an unknown subtitleId', async () => {
      await expect(getSubtitleLines('unknown-id')).rejects.toThrow('Subtitle not found: unknown-id')
    })
  })
  ```

- [ ] **Step 4: Run to confirm failure**

  ```bash
  npx jest utils/__tests__/videoService.test.js --verbose
  ```

  Expected: FAIL — "Cannot find module '../../services/videoService'"

- [ ] **Step 5: Implement videoService**

  Create `services/videoService.js`:

  ```javascript
  // Data access layer.
  // Local mode: imports from data/ modules.
  // Server mode (future): replace getVideos() and getSubtitleLines() with API calls only.

  import { VIDEOS } from '../data/videos.js'
  import peppaMuddyPuddles from '../data/subtitles/peppa-muddy-puddles.js'

  const SUBTITLE_MAP = {
    'peppa-muddy-puddles': peppaMuddyPuddles
  }

  export async function getVideos() {
    return VIDEOS
  }

  export async function getSubtitleLines(subtitleId) {
    const lines = SUBTITLE_MAP[subtitleId]
    if (!lines) throw new Error(`Subtitle not found: ${subtitleId}`)
    return lines
  }
  ```

- [ ] **Step 6: Run to confirm passing**

  ```bash
  npx jest utils/__tests__/videoService.test.js --verbose
  ```

  Expected: PASS — all 3 tests green.

- [ ] **Step 7: Add placeholder cover image**

  Place any `.jpg` file at `static/covers/peppa-muddy-puddles.jpg` (placeholder for now).
  Place your video file at `static/videos/peppa-muddy-puddles.mp4`.

- [ ] **Step 8: Commit**

  ```bash
  git add data/ services/videoService.js utils/__tests__/videoService.test.js static/covers/
  git commit -m "feat: add video data layer and service"
  ```

---

### Task 5: Home page

**Files:**
- Create: `pages/home/index.vue`

- [ ] **Step 1: Create home page**

  Create `pages/home/index.vue`:

  ```vue
  <template>
    <view class="home">
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>
      <scroll-view v-else scroll-y class="video-list">
        <view
          v-for="video in videos"
          :key="video.id"
          class="video-card"
          @click="openVideo(video)"
        >
          <image :src="video.coverImage" class="cover" mode="aspectFill" />
          <view class="info">
            <text class="video-title">{{ video.title }}</text>
            <text class="duration">{{ formatDuration(video.duration) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </template>

  <script setup>
  import { ref, onMounted } from 'vue'
  import { getVideos } from '../../services/videoService.js'

  const videos = ref([])
  const loading = ref(true)

  onMounted(async () => {
    videos.value = await getVideos()
    loading.value = false
  })

  function openVideo(video) {
    uni.navigateTo({
      url: `/pages/player/index?videoId=${video.id}&subtitleId=${video.subtitleId}`
    })
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  </script>

  <style scoped>
  .home { min-height: 100vh; background: #f7f7f7; }
  .video-list { height: 100vh; padding: 16rpx; box-sizing: border-box; }
  .video-card {
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .cover { width: 200rpx; height: 130rpx; flex-shrink: 0; }
  .info { padding: 20rpx 24rpx; flex: 1; }
  .video-title { font-size: 30rpx; font-weight: 600; color: #222; display: block; margin-bottom: 8rpx; }
  .duration { font-size: 24rpx; color: #aaa; }
  .loading { display: flex; justify-content: center; padding-top: 100rpx; color: #aaa; font-size: 28rpx; }
  </style>
  ```

- [ ] **Step 2: Delete the generated index page**

  Delete `pages/index/index.vue` (generated by HBuilderX, no longer needed — home page is now `pages/home/index`).

- [ ] **Step 3: Run in HBuilderX simulator**

  Click **Run → Run to iOS Simulator** (or Android Emulator).

  Expected: Home page loads showing the video card with cover thumbnail, title, and duration.

- [ ] **Step 4: Commit**

  ```bash
  git add pages/home/index.vue
  git commit -m "feat: add home page with video list"
  ```

---

### Task 6: Player page — video and subtitle sync

**Files:**
- Create: `pages/player/index.vue`

Builds video playback with real-time subtitle sync and auto-scrolling transcript. Display modes and full toolbar are added in Tasks 7 and 8.

- [ ] **Step 1: Create the player page**

  Create `pages/player/index.vue`:

  ```vue
  <template>
    <view class="player">
      <!-- Custom nav bar -->
      <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <text class="nav-back" @click="goBack">←</text>
        <text class="nav-title">{{ videoTitle }}</text>
        <view style="width:80rpx" />
      </view>

      <!-- Video with always-on bilingual subtitle overlay -->
      <view class="video-wrap">
        <video
          id="main-video"
          :src="videoUrl"
          :controls="false"
          :show-play-btn="false"
          :enable-progress-gesture="false"
          :playback-rate="playbackRate"
          object-fit="contain"
          class="video"
          @timeupdate="onTimeUpdate"
          @play="playing = true"
          @pause="playing = false"
          @ended="onVideoEnded"
        />
        <view class="subtitle-overlay" v-if="currentLine">
          <text class="sub-en">{{ currentLine.english }}</text>
          <text class="sub-zh">{{ currentLine.chinese }}</text>
        </view>
      </view>

      <!-- Transcript -->
      <scroll-view
        scroll-y
        :scroll-into-view="scrollTarget"
        scroll-with-animation
        class="transcript"
      >
        <view
          v-for="(line, i) in subtitleLines"
          :key="line.index"
          :id="`line-${i}`"
          :class="['line-item', { active: i === currentLineIndex }]"
          @click="jumpToLine(i)"
        >
          <text class="line-en">{{ line.english }}</text>
          <text class="line-zh">{{ line.chinese }}</text>
        </view>
      </scroll-view>

      <!-- Placeholder controls (replaced in Task 8) -->
      <view class="controls-placeholder">
        <text class="ctrl-btn" @click="prevLine">⏮</text>
        <text class="ctrl-btn large" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</text>
        <text class="ctrl-btn" @click="nextLine">⏭</text>
      </view>
    </view>
  </template>

  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { onLoad } from '@dcloudio/uni-app'
  import { getSubtitleLines } from '../../services/videoService.js'
  import { VIDEOS } from '../../data/videos.js'

  const videoId = ref('')
  const subtitleId = ref('')
  const subtitleLines = ref([])
  const currentLineIndex = ref(0)
  const playing = ref(false)
  const statusBarHeight = ref(0)
  const scrollTarget = ref('')
  const playbackRate = ref(1.0)

  let videoContext = null

  onLoad(options => {
    videoId.value = options.videoId
    subtitleId.value = options.subtitleId
  })

  onMounted(async () => {
    uni.getSystemInfo({ success: res => { statusBarHeight.value = res.statusBarHeight } })
    if (subtitleId.value) {
      subtitleLines.value = await getSubtitleLines(subtitleId.value)
    }
    videoContext = uni.createVideoContext('main-video')
  })

  const currentVideo = computed(() => VIDEOS.find(v => v.id === videoId.value))
  const videoTitle = computed(() => currentVideo.value?.title ?? '')
  const videoUrl = computed(() => currentVideo.value?.videoUrl ?? '')
  const currentLine = computed(() => subtitleLines.value[currentLineIndex.value] ?? null)

  function onTimeUpdate(e) {
    const ms = e.detail.currentTime * 1000
    const idx = subtitleLines.value.findIndex(l => ms >= l.startTime && ms < l.endTime)
    if (idx !== -1 && idx !== currentLineIndex.value) {
      currentLineIndex.value = idx
      scrollTarget.value = `line-${idx}`
    }
  }

  function onVideoEnded() {
    playing.value = false
  }

  function togglePlay() {
    if (playing.value) videoContext.pause()
    else videoContext.play()
  }

  function jumpToLine(index) {
    const line = subtitleLines.value[index]
    if (!line) return
    currentLineIndex.value = index
    scrollTarget.value = `line-${index}`
    videoContext.seek(line.startTime / 1000)
    videoContext.play()
  }

  function prevLine() {
    if (currentLineIndex.value > 0) jumpToLine(currentLineIndex.value - 1)
  }

  function nextLine() {
    if (currentLineIndex.value < subtitleLines.value.length - 1) jumpToLine(currentLineIndex.value + 1)
  }

  function goBack() {
    uni.navigateBack()
  }
  </script>

  <style scoped>
  .player { display: flex; flex-direction: column; height: 100vh; background: #fff; }
  .nav-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12rpx 24rpx; background: #fff; border-bottom: 1rpx solid #eee;
  }
  .nav-back { font-size: 36rpx; color: #333; padding: 8rpx 16rpx; }
  .nav-title { font-size: 30rpx; font-weight: 600; color: #222; }
  .video-wrap { position: relative; width: 100%; height: 420rpx; background: #000; flex-shrink: 0; }
  .video { width: 100%; height: 100%; }
  .subtitle-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.55); padding: 12rpx 24rpx 16rpx; text-align: center;
  }
  .sub-en { display: block; color: #fff; font-size: 28rpx; font-weight: 600; }
  .sub-zh { display: block; color: #ddd; font-size: 24rpx; margin-top: 4rpx; }
  .transcript { flex: 1; overflow: hidden; background: #fff; }
  .line-item { padding: 24rpx 32rpx; border-bottom: 1rpx solid #f5f5f5; }
  .line-item.active { background: #eef3ff; border-left: 6rpx solid #4a7eff; padding-left: 26rpx; }
  .line-en { display: block; font-size: 30rpx; font-weight: 700; color: #222; line-height: 1.4; }
  .line-item.active .line-en { color: #4a7eff; }
  .line-zh { display: block; font-size: 26rpx; color: #999; margin-top: 6rpx; }
  .line-item.active .line-zh { color: #7a9eff; }
  .controls-placeholder {
    display: flex; justify-content: center; align-items: center;
    gap: 60rpx; padding: 24rpx 0; border-top: 1rpx solid #eee; background: #fff;
  }
  .ctrl-btn { font-size: 40rpx; color: #444; }
  .ctrl-btn.large { font-size: 56rpx; }
  </style>
  ```

- [ ] **Step 2: Test in HBuilderX simulator**

  Tap a video on home page.

  Expected:
  - Video plays with bilingual subtitle overlay
  - Current line highlights blue in transcript as audio progresses
  - Transcript auto-scrolls to keep current line visible
  - ⏮ ⏸/▶ ⏭ buttons work

- [ ] **Step 3: Commit**

  ```bash
  git add pages/player/index.vue
  git commit -m "feat: add player page with video and subtitle sync"
  ```

---

### Task 7: Display modes in transcript

**Files:**
- Modify: `pages/player/index.vue`

- [ ] **Step 1: Add display mode state to `<script setup>`**

  ```javascript
  const DISPLAY_MODES = ['bilingual', 'en', 'zh', 'blank']
  const DISPLAY_LABELS = ['双语', '英文', '中文', '隐藏']
  const displayModeIndex = ref(0)
  const displayMode = computed(() => DISPLAY_MODES[displayModeIndex.value])
  const displayModeLabel = computed(() => DISPLAY_LABELS[displayModeIndex.value])

  function cycleDisplayMode() {
    displayModeIndex.value = (displayModeIndex.value + 1) % DISPLAY_MODES.length
  }
  ```

- [ ] **Step 2: Replace transcript line template**

  Replace the `v-for` block in `<template>` with:

  ```html
  <view
    v-for="(line, i) in subtitleLines"
    :key="line.index"
    :id="`line-${i}`"
    :class="['line-item', { active: i === currentLineIndex }]"
    @click="jumpToLine(i)"
  >
    <view v-if="displayMode === 'blank'" class="blank-bars">
      <view class="grey-bar long" />
      <view class="grey-bar short" />
    </view>
    <template v-else>
      <text v-if="displayMode === 'en' || displayMode === 'bilingual'" class="line-en">
        {{ line.english }}
      </text>
      <text v-if="displayMode === 'zh' || displayMode === 'bilingual'" class="line-zh">
        {{ line.chinese }}
      </text>
    </template>
  </view>
  ```

- [ ] **Step 3: Add mode button to controls placeholder**

  Replace `.controls-placeholder` in `<template>` with:

  ```html
  <view class="controls-placeholder">
    <text class="ctrl-btn" @click="prevLine">⏮</text>
    <text class="ctrl-btn large" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</text>
    <text class="ctrl-btn" @click="nextLine">⏭</text>
    <text class="mode-btn" @click="cycleDisplayMode">{{ displayModeLabel }}</text>
  </view>
  ```

- [ ] **Step 4: Add styles for blank mode and mode button**

  Add to `<style scoped>`:

  ```css
  .blank-bars { padding: 6rpx 0; }
  .grey-bar { height: 28rpx; background: #e0e0e0; border-radius: 6rpx; margin-bottom: 10rpx; }
  .grey-bar.long { width: 80%; }
  .grey-bar.short { width: 50%; }
  .mode-btn {
    font-size: 26rpx; background: #f0f0f0;
    padding: 8rpx 20rpx; border-radius: 20rpx; color: #555;
  }
  ```

- [ ] **Step 5: Test all 4 modes in simulator**

  Tap the mode button repeatedly and verify:
  - 双语: English + Chinese per line
  - 英文: English only
  - 中文: Chinese only
  - 隐藏: grey bars, no text
  - Subtitle overlay on video always shows both languages

- [ ] **Step 6: Commit**

  ```bash
  git add pages/player/index.vue
  git commit -m "feat: add 4 display modes to transcript"
  ```

---

### Task 8: Full bottom toolbar

**Files:**
- Modify: `pages/player/index.vue`

- [ ] **Step 1: Add toolbar state to `<script setup>`**

  ```javascript
  // Speed — note: playbackRate ref was already declared in Task 6. Do NOT re-declare it.
  // Just add speedIndex, cycleSpeed, and speedLabel here.
  const SPEEDS = [0.75, 1.0, 1.25, 1.5]
  const speedIndex = ref(1) // index 1 = 1.0x default
  function cycleSpeed() {
    speedIndex.value = (speedIndex.value + 1) % SPEEDS.length
    playbackRate.value = SPEEDS[speedIndex.value]
  }
  const speedLabel = computed(() => `${SPEEDS[speedIndex.value]}x`)

  // Order
  const ORDER_MODES = ['sequence', 'loop-one', 'loop-all']
  const ORDER_LABELS = ['顺序', '单句', '全文']
  const orderModeIndex = ref(0)
  const orderMode = computed(() => ORDER_MODES[orderModeIndex.value])
  const orderModeLabel = computed(() => ORDER_LABELS[orderModeIndex.value])
  function cycleOrderMode() {
    orderModeIndex.value = (orderModeIndex.value + 1) % ORDER_MODES.length
  }

  // Repeat (1 = off, 2+ = repeat N times before advancing; default 2)
  const REPEAT_OPTIONS = [1, 2, 3, 5]
  const repeatIndex = ref(1) // default index 1 → repeatCount 2
  const repeatCount = computed(() => REPEAT_OPTIONS[repeatIndex.value])
  const repeatLabel = computed(() => repeatCount.value === 1 ? '复读' : `复读×${repeatCount.value}`)
  let repeatRemaining = 0
  function cycleRepeat() {
    repeatIndex.value = (repeatIndex.value + 1) % REPEAT_OPTIONS.length
    repeatRemaining = 0
  }
  ```

- [ ] **Step 2: Update onTimeUpdate to handle repeat and loop-one**

  Replace the existing `onTimeUpdate` function:

  ```javascript
  function onTimeUpdate(e) {
    const ms = e.detail.currentTime * 1000
    const idx = subtitleLines.value.findIndex(l => ms >= l.startTime && ms < l.endTime)
    if (idx !== -1 && idx !== currentLineIndex.value) {
      currentLineIndex.value = idx
      scrollTarget.value = `line-${idx}`
      repeatRemaining = repeatCount.value - 1
    }
    // Handle line-end for repeat and loop-one modes
    const line = subtitleLines.value[currentLineIndex.value]
    if (line && ms >= line.endTime - 80) {
      if (repeatRemaining > 0) {
        repeatRemaining--
        videoContext.seek(line.startTime / 1000)
        videoContext.play()
      } else if (orderMode.value === 'loop-one') {
        videoContext.seek(line.startTime / 1000)
        videoContext.play()
      }
    }
  }
  ```

- [ ] **Step 3: Update onVideoEnded to handle loop-all**

  Replace the existing `onVideoEnded` function:

  ```javascript
  function onVideoEnded() {
    playing.value = false
    if (orderMode.value === 'loop-all') {
      videoContext.seek(0)
      videoContext.play()
    }
  }
  ```

- [ ] **Step 4: Add goToShadowing function**

  ```javascript
  function goToShadowing() {
    videoContext.pause()
    uni.navigateTo({
      url: `/pages/shadowing/index?videoId=${videoId.value}&subtitleId=${subtitleId.value}&lineIndex=${currentLineIndex.value}`
    })
  }
  ```

- [ ] **Step 5: Replace controls-placeholder with full toolbar + playback bar**

  Remove the `.controls-placeholder` block and replace with:

  ```html
  <!-- Bottom toolbar -->
  <view class="toolbar">
    <view class="tool-btn" @click="cycleSpeed">
      <text class="tool-icon">⏱</text>
      <text class="tool-label">{{ speedLabel }}</text>
    </view>
    <view class="tool-btn" @click="cycleOrderMode">
      <text class="tool-icon">≡</text>
      <text class="tool-label">{{ orderModeLabel }}</text>
    </view>
    <view class="tool-btn">
      <text class="tool-icon">👆</text>
      <text class="tool-label">点读</text>
    </view>
    <view class="tool-btn" @click="cycleRepeat">
      <text class="tool-icon">🔁</text>
      <text class="tool-label">{{ repeatLabel }}</text>
    </view>
    <view class="tool-btn" @click="cycleDisplayMode">
      <text class="tool-icon">文</text>
      <text class="tool-label">{{ displayModeLabel }}</text>
    </view>
    <view class="tool-btn" @click="goToShadowing">
      <text class="tool-icon">🎤</text>
      <text class="tool-label">跟读</text>
    </view>
  </view>

  <!-- Playback controls -->
  <view class="playback-bar safe-area-bottom">
    <text class="ctrl-btn" @click="prevLine">⏮</text>
    <view class="play-btn" @click="togglePlay">
      <text class="play-icon">{{ playing ? '⏸' : '▶' }}</text>
    </view>
    <text class="ctrl-btn" @click="nextLine">⏭</text>
  </view>
  ```

- [ ] **Step 6: Remove .controls-placeholder styles, add toolbar styles**

  Remove the `.controls-placeholder`, `.ctrl-btn`, `.ctrl-btn.large` rules. Add:

  ```css
  .toolbar {
    display: flex; justify-content: space-around; align-items: center;
    padding: 16rpx 8rpx; border-top: 1rpx solid #eee; background: #fafafa;
  }
  .tool-btn { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
  .tool-icon { font-size: 36rpx; }
  .tool-label { font-size: 20rpx; color: #666; }
  .playback-bar {
    display: flex; justify-content: center; align-items: center;
    gap: 80rpx; padding: 16rpx 0 20rpx; background: #fff; border-top: 1rpx solid #f0f0f0;
  }
  .ctrl-btn { font-size: 44rpx; color: #444; }
  .play-btn {
    width: 88rpx; height: 88rpx; background: #222; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .play-icon { font-size: 36rpx; color: #fff; text-align: center; }
  ```

- [ ] **Step 7: Test all toolbar buttons in simulator**

  - 倍速 cycles 0.75x / 1.0x / 1.25x / 1.5x and video speed changes
  - 顺序 cycles through 顺序 / 单句 / 全文; single-line loop and full-loop both work
  - 复读 cycles ×2 / ×3 / ×5 / off; line repeats the configured number of times before advancing
  - 显示 cycles all 4 modes
  - 跟读 navigates to shadowing page (may error — page is built in Task 10)

- [ ] **Step 8: Commit**

  ```bash
  git add pages/player/index.vue
  git commit -m "feat: add full bottom toolbar with speed, repeat, order, and shadowing nav"
  ```

---

### Task 9: Recording service

**Files:**
- Create: `services/recordingService.js`

This wraps uni-app's recorder and audio APIs. Manual testing in Task 10 (device APIs cannot be unit tested without significant mocking).

- [ ] **Step 1: Create recordingService.js**

  Create `services/recordingService.js`:

  ```javascript
  // Wraps uni-app recording and audio playback.
  // All device audio work stays here so pages stay clean.

  let recorderManager = null
  let audioCtx = null

  function getRecorder() {
    if (!recorderManager) recorderManager = uni.getRecorderManager()
    return recorderManager
  }

  // Returns a promise that resolves with the recorded file path when stopRecording() is called.
  export function startRecording() {
    return new Promise((resolve, reject) => {
      const rm = getRecorder()
      rm.onStop(res => resolve(res.tempFilePath))
      rm.onError(e => reject(new Error(e.errMsg || 'Recording failed')))
      rm.start({ format: 'mp3', sampleRate: 16000, numberOfChannels: 1, encodeBitRate: 48000 })
    })
  }

  export function stopRecording() {
    getRecorder().stop()
  }

  // Returns a promise that resolves when playback ends.
  export function playAudio(filePath) {
    return new Promise((resolve, reject) => {
      if (audioCtx) { audioCtx.stop(); audioCtx.destroy() }
      audioCtx = uni.createInnerAudioContext()
      audioCtx.src = filePath
      audioCtx.onEnded(() => resolve())
      audioCtx.onError(e => reject(new Error(e.errMsg || 'Playback failed')))
      audioCtx.play()
    })
  }

  export function stopAudio() {
    if (audioCtx) { audioCtx.stop(); audioCtx.destroy(); audioCtx = null }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add services/recordingService.js
  git commit -m "feat: add recording service for audio capture and playback"
  ```

---

### Task 10: Shadowing page

**Files:**
- Create: `pages/shadowing/index.vue`

- [ ] **Step 1: Create shadowing page**

  Create `pages/shadowing/index.vue`:

  ```vue
  <template>
    <view class="shadowing">
      <!-- Video paused at current line's start time -->
      <view class="video-wrap" @click="previewLine">
        <video
          id="shadow-video"
          :src="videoUrl"
          :controls="false"
          :show-play-btn="false"
          :enable-progress-gesture="false"
          object-fit="contain"
          class="video"
        />
        <view class="play-overlay">
          <text class="play-icon">▶</text>
        </view>
      </view>

      <!-- Scrollable lines list -->
      <scroll-view
        scroll-y
        :scroll-into-view="`shadow-line-${activeIndex}`"
        scroll-with-animation
        class="lines-list"
      >
        <view
          v-for="(line, i) in subtitleLines"
          :key="line.index"
          :id="`shadow-line-${i}`"
          :class="['shadow-line', { 'is-active': i === activeIndex }]"
          @click="i !== activeIndex && setActiveLine(i)"
        >
          <text class="timestamp">{{ formatMs(line.startTime) }} – {{ formatMs(line.endTime) }}</text>

          <!-- Active line -->
          <template v-if="i === activeIndex">
            <text class="line-en active">{{ line.english }}</text>
            <text class="line-zh active">{{ line.chinese }}</text>

            <view class="action-row">
              <view class="action-btn" @click.stop="listenOriginal">
                <text class="action-icon listen-icon">🔊</text>
                <text class="action-label">听示范</text>
              </view>
              <view
                :class="['action-btn', 'record-btn', { recording: isRecording }]"
                @click.stop="toggleRecord"
              >
                <text class="action-icon record-icon">🎤</text>
                <text class="action-label">{{ isRecording ? '停止' : '点击跟读' }}</text>
              </view>
              <view
                :class="['action-btn', { disabled: !recordings[activeIndex] }]"
                @click.stop="playMyRecording"
              >
                <text class="action-icon my-icon">▶</text>
                <text class="action-label">我的跟读</text>
              </view>
            </view>

            <view v-if="scores[activeIndex] != null" class="score-row">
              <text class="score-label">发音得分</text>
              <view class="score-bar-wrap">
                <view class="score-bar" :style="{ width: scores[activeIndex] + '%' }" />
              </view>
              <text class="score-value">{{ scores[activeIndex] }}</text>
            </view>
          </template>

          <!-- Inactive line -->
          <template v-else>
            <view class="inactive-content">
              <view>
                <text class="line-en">{{ line.english }}</text>
                <text class="line-zh">{{ line.chinese }}</text>
              </view>
              <view :class="['badge', recordings[i] ? 'done' : 'unread']">
                <text>{{ recordings[i] ? '已读' : '未读' }}</text>
              </view>
            </view>
          </template>
        </view>
      </scroll-view>
    </view>
  </template>

  <script setup>
  import { ref, computed } from 'vue'
  import { onLoad } from '@dcloudio/uni-app'
  import { getSubtitleLines } from '../../services/videoService.js'
  import { VIDEOS } from '../../data/videos.js'
  import { startRecording, stopRecording, playAudio } from '../../services/recordingService.js'

  const videoId = ref('')
  const subtitleId = ref('')
  const activeIndex = ref(0)
  const subtitleLines = ref([])
  const isRecording = ref(false)
  const recordings = ref({})   // lineIndex → tempFilePath
  const scores = ref({})       // lineIndex → 0-100 (populated by Task 11)

  let videoContext = null
  let pendingRecording = null  // promise from startRecording()

  const videoUrl = computed(() => VIDEOS.find(v => v.id === videoId.value)?.videoUrl ?? '')

  onLoad(async options => {
    videoId.value = options.videoId
    subtitleId.value = options.subtitleId
    activeIndex.value = parseInt(options.lineIndex) || 0
    subtitleLines.value = await getSubtitleLines(subtitleId.value)
    videoContext = uni.createVideoContext('shadow-video')
    seekToActive()
  })

  function seekToActive() {
    const line = subtitleLines.value[activeIndex.value]
    if (line && videoContext) videoContext.seek(line.startTime / 1000)
  }

  function setActiveLine(i) {
    activeIndex.value = i
    seekToActive()
  }

  function previewLine() {
    listenOriginal()
  }

  function listenOriginal() {
    const line = subtitleLines.value[activeIndex.value]
    if (!line || !videoContext) return
    videoContext.seek(line.startTime / 1000)
    videoContext.play()
    setTimeout(() => videoContext.pause(), line.endTime - line.startTime)
  }

  async function toggleRecord() {
    if (isRecording.value) {
      isRecording.value = false
      stopRecording()
      const filePath = await pendingRecording
      recordings.value = { ...recordings.value, [activeIndex.value]: filePath }
      await playAudio(filePath)
      // scores populated in Task 11 — leave null for now
    } else {
      isRecording.value = true
      pendingRecording = startRecording()
    }
  }

  async function playMyRecording() {
    const filePath = recordings.value[activeIndex.value]
    if (!filePath) return
    await playAudio(filePath)
  }

  function formatMs(ms) {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    const msRem = ms % 1000
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(msRem).padStart(3, '0')}`
  }
  </script>

  <style scoped>
  .shadowing { display: flex; flex-direction: column; height: 100vh; background: #f7f7f7; }
  .video-wrap { position: relative; width: 100%; height: 400rpx; background: #111; flex-shrink: 0; }
  .video { width: 100%; height: 100%; }
  .play-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .play-icon {
    font-size: 48rpx; color: rgba(255,255,255,0.9);
    background: rgba(0,0,0,0.3); border-radius: 50%;
    width: 100rpx; height: 100rpx; line-height: 100rpx; text-align: center;
  }
  .lines-list { flex: 1; overflow: hidden; }
  .shadow-line { background: #fff; padding: 24rpx 32rpx; border-bottom: 1rpx solid #eee; }
  .shadow-line.is-active { background: #f0f8f0; border-left: 6rpx solid #4caf50; padding-left: 26rpx; }
  .timestamp { font-size: 20rpx; color: #bbb; display: block; margin-bottom: 8rpx; }
  .line-en { display: block; font-size: 30rpx; font-weight: 700; color: #333; }
  .line-en.active { font-size: 34rpx; color: #222; margin-bottom: 6rpx; }
  .line-zh { display: block; font-size: 26rpx; color: #999; margin-top: 4rpx; }
  .line-zh.active { font-size: 28rpx; color: #666; }
  .inactive-content { display: flex; justify-content: space-between; align-items: center; }
  .badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; flex-shrink: 0; }
  .badge.unread { background: #fff3e0; color: #ff9800; }
  .badge.done { background: #f0f0f0; color: #bbb; }
  .action-row {
    display: flex; justify-content: space-around;
    margin-top: 24rpx; margin-bottom: 8rpx;
  }
  .action-btn { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
  .action-icon {
    width: 80rpx; height: 80rpx; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 32rpx; text-align: center; line-height: 80rpx;
  }
  .listen-icon { border: 2rpx solid #4caf50; color: #4caf50; }
  .record-icon { background: #4caf50; color: #fff; font-size: 36rpx; }
  .recording .record-icon { background: #f44336; }
  .my-icon { border: 2rpx solid #ccc; color: #ccc; }
  .action-label { font-size: 22rpx; color: #555; }
  .disabled { opacity: 0.35; }
  .score-row {
    display: flex; align-items: center; gap: 16rpx;
    margin-top: 16rpx; padding: 16rpx 20rpx;
    background: #fff; border-radius: 12rpx;
  }
  .score-label { font-size: 22rpx; color: #888; white-space: nowrap; }
  .score-bar-wrap { flex: 1; height: 10rpx; background: #eee; border-radius: 5rpx; overflow: hidden; }
  .score-bar { height: 100%; background: #4caf50; border-radius: 5rpx; }
  .score-value { font-size: 28rpx; font-weight: 700; color: #4caf50; white-space: nowrap; }
  </style>
  ```

- [ ] **Step 2: Test shadowing page manually in simulator (mic requires real device)**

  Tap 跟读 from the player page.

  Expected:
  - Page opens with video paused at the current line
  - Active line shows English + Chinese + 3 buttons
  - Other lines show with 未读 badge
  - Tapping another line makes it active and seeks video
  - 听示范 plays the line then pauses
  - On real device: 点击跟读 starts recording (button turns red); tap again → stops, plays back automatically; 我的跟读 button activates; 已读 badge appears on the line
  - Score row does not appear yet (populated in Task 11)

- [ ] **Step 3: Commit**

  ```bash
  git add pages/shadowing/index.vue
  git commit -m "feat: add shadowing page with line-by-line record and playback"
  ```

---

### Task 11: iFlytek pronunciation scoring

**Files:**
- Create: `services/iflytekService.js`
- Modify: `pages/shadowing/index.vue`

**Prerequisites:** Register at [console.xfyun.cn](https://console.xfyun.cn), create an app, enable **口语评测 (Spoken Language Evaluation)**, and copy your APPID, APIKey, APISecret.

- [ ] **Step 1: Create iflytekService.js**

  Create `services/iflytekService.js`:

  ```javascript
  // iFlytek Spoken Language Evaluation (口语评测) HTTP API
  // Fill in your credentials from console.xfyun.cn before using.
  // Full API docs: https://www.xfyun.cn/doc/Aiui/ope_guide.html

  const APPID = 'YOUR_APPID'       // replace before use
  const API_KEY = 'YOUR_API_KEY'   // replace before use

  export async function scorePronunciation(audioFilePath, referenceText) {
    const base64Audio = await readFileAsBase64(audioFilePath)

    return new Promise((resolve, reject) => {
      const curTime = String(Math.floor(Date.now() / 1000))
      const paramStr = JSON.stringify({
        auf: 'audio/L16;rate=16000',
        aue: 'lame',
        tte: 'utf8',
        ent: 'en_us-ise',
        category: 'read_sentence'
      })
      const paramBase64 = btoa(paramStr)

      uni.request({
        url: 'https://ise-api.xfyun.cn/v2/open-ise',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Appid': APPID,
          'X-CurTime': curTime,
          'X-Param': paramBase64,
          // Checksum = MD5(APIKey + CurTime + Param)
          // Use a crypto library: npm install crypto-js
          // 'X-CheckSum': CryptoJS.MD5(API_KEY + curTime + paramBase64).toString()
          'X-CheckSum': 'REPLACE_WITH_MD5(API_KEY + curTime + paramBase64)'
        },
        data: `auf=audio%2FL16%3Brate%3D16000&aue=lame&engine_type=en_us-ise&text=${encodeURIComponent(referenceText)}&audio=${encodeURIComponent(base64Audio)}`,
        success(res) {
          try {
            resolve(extractScore(res.data))
          } catch {
            reject(new Error('Failed to parse iFlytek score response'))
          }
        },
        fail(e) { reject(new Error(e.errMsg || 'iFlytek request failed')) }
      })
    })
  }

  function extractScore(responseData) {
    // iFlytek returns XML result base64-encoded in payload.result.text
    const resultText = responseData?.payload?.result?.text
    if (!resultText) throw new Error('No result text in response')
    const xml = atob(resultText)
    const match = xml.match(/total_score="([\d.]+)"/)
    if (!match) throw new Error('No total_score in XML result')
    return Math.round(parseFloat(match[1]))
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

  **Note:** The checksum requires an MD5 hash. Install `crypto-js`:
  ```bash
  npm install crypto-js
  ```
  Then in `iflytekService.js` add at top:
  ```javascript
  import CryptoJS from 'crypto-js'
  ```
  And replace the `X-CheckSum` placeholder with:
  ```javascript
  'X-CheckSum': CryptoJS.MD5(API_KEY + curTime + paramBase64).toString()
  ```

- [ ] **Step 2: Wire scoring into shadowing page**

  In `pages/shadowing/index.vue` `<script setup>`, add import:

  ```javascript
  import { scorePronunciation } from '../../services/iflytekService.js'
  ```

  In `toggleRecord`, after `await playAudio(filePath)`, replace the `// scores populated in Task 11` comment with:

  ```javascript
  const line = subtitleLines.value[activeIndex.value]
  scorePronunciation(filePath, line.english)
    .then(score => { scores.value = { ...scores.value, [activeIndex.value]: score } })
    .catch(() => { scores.value = { ...scores.value, [activeIndex.value]: 0 } })
  ```

- [ ] **Step 3: Test on a real device**

  iFlytek APIs require network and real microphone — simulator is insufficient.

  Expected after recording:
  - Score bar fills and number (0–100) appears below the active line
  - Higher quality pronunciation → higher score

- [ ] **Step 4: Commit**

  ```bash
  git add services/iflytekService.js pages/shadowing/index.vue
  git commit -m "feat: integrate iFlytek pronunciation scoring in shadowing page"
  ```

---

## Done

All tasks complete. The app has:
- Home page listing cartoon videos
- Player page with subtitle sync, 4 display modes, and a full 6-button toolbar
- Shadowing page with per-line recording, playback, and pronunciation scoring
- A `videoService` abstraction (two functions to replace for server migration)
