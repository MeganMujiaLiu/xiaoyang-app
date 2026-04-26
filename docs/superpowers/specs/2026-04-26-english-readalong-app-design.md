# English Read-Along App — Design Spec

**Date:** 2026-04-26  
**Platform:** uni-app (HBuilderX) — iOS/Android primary, WeChat Mini Program secondary  
**Scope:** Student self-practice feature (teacher role deferred)

---

## Overview

A cartoon-video-based English reading and listening app. Students watch short cartoon clips line by line, read along with synchronized subtitles, and practice shadowing (recording themselves repeating each line with pronunciation scoring).

Inspired by the 每日听读 app. Core experience: video on top, bilingual transcript below, 跟读 as a separate practice page.

---

## Pages

### 1. Home Page (`/pages/home/index`)

- Grid or list of cartoon videos
- Each item: thumbnail, title, duration
- Tap to open the Player page

### 2. Player Page (`/pages/player/index`)

Main read/listen experience.

**Layout (top to bottom):**
1. **Video player** (~40% of screen height)
   - Subtitle overlay always shows current line: English + Chinese, regardless of display mode
2. **Transcript scroll area**
   - All subtitle lines listed vertically
   - Current line highlighted in blue, auto-scrolls into view
   - Display mode controls what text is visible (see Display Modes)
3. **Bottom toolbar** (6 buttons):
   - 倍速 — cycle playback speed: 0.75x / 1.0x / 1.25x / 1.5x
   - 顺序 — playback order: sequential / loop one line / loop all
   - 点读 — tap any transcript line to jump video to that position
   - 复读 — auto-repeat current line before advancing; user sets repeat count (1–5, default 2)
   - 显示 — cycle through 4 display modes
   - 跟读 — navigate to the Shadowing page, starting from the currently active line
4. **Playback controls**: ⏮ ⏸/▶ ⏭

**Display Modes** (cycled by 显示 button, persisted per-session):

| Mode | English in transcript | Chinese in transcript |
|---|---|---|
| English only | shown | hidden |
| Chinese only | hidden | shown |
| English + Chinese (default) | shown | shown |
| Blank | grey bars | grey bars |

The video subtitle overlay always shows English + Chinese regardless of mode.

**Subtitle sync:**
- `timeupdate` event fires continuously during playback
- Current subtitle line determined by matching current time against `[startTime, endTime]` ranges
- Transcript auto-scrolls to keep current line in view

### 3. Shadowing Page (`/pages/shadowing/index`)

A separate page for line-by-line pronunciation practice.

**Layout:**
1. **Video** at top — paused and scrubbed to the start of the active line
2. **Scrollable line list** — all lines visible; one active line at a time
3. **Active line** shows:
   - Timestamp, English text, Chinese text
   - Three action buttons:
     - 听示范 — plays the original audio clip for this line
     - 点击跟读 — starts/stops recording the student's voice
     - 我的跟读 — plays back the student's recording
   - Pronunciation score (0–100) displayed after recording, via iFlytek 讯飞 API
4. **Other lines** show read/unread badge; tap to jump to that line
5. **Bottom bar**: 设置配音模式 (settings); 同学作品 hidden (deferred to teacher/social feature)

**Shadowing flow per line:**
1. Video paused at line start timestamp
2. Student taps 听示范 to hear the original (optional)
3. Student taps 点击跟读 → recording starts
4. Student taps again → recording stops, plays back automatically
5. Pronunciation score displayed
6. Student can re-record or advance to next line

---

## Data Model

```
Video {
  id: string
  title: string
  coverImage: string       // local path now, URL later
  videoUrl: string         // local path now, URL later
  subtitleUrl: string      // path to .srt file, local now
  duration: number         // seconds
}

SubtitleLine {
  index: number
  startTime: number        // milliseconds
  endTime: number          // milliseconds
  english: string
  chinese: string
}

RecordingSession {
  lineIndex: number
  audioFilePath: string    // local temp file
  score: number            // 0–100 from pronunciation API
  timestamp: number        // unix ms
}
```

---

## Technical Architecture

**Framework:** uni-app + Vue 3 Composition API, built in HBuilderX

**Key APIs:**
- `<video>` component + `timeupdate` event — subtitle sync and auto-pause
- `uni.getRecorderManager()` — student voice recording
- `uni.createInnerAudioContext()` — audio playback (original clip + student recording)
- `uni.setStorageSync` / `uni.getStorageSync` — local progress and recording session storage
- iFlytek 讯飞 pronunciation evaluation API — scoring

**Subtitle parsing:**
- SRT format supported (`.srt` files bundled locally)
- Parser utility: `utils/parseSrt.js` — returns `SubtitleLine[]`

**Data service layer (`services/videoService.js`):**
- All data access (video list, subtitle files, recordings) goes through this single service
- Currently reads from local bundled files and `uni.storage`
- When backend is ready: replace service internals with API calls — no other files change

**File structure:**
```
pages/
  home/index.vue
  player/index.vue
  shadowing/index.vue
utils/
  parseSrt.js
services/
  videoService.js
static/
  videos/          ← cartoon video files (local for now)
  subtitles/       ← .srt files (local for now)
  covers/          ← thumbnail images
```

---

## Out of Scope (this phase)

- Teacher role (content management, student assignment)
- Classmates' works (同学作品)
- Vocabulary tab (词汇), bookmarks (收藏), notes (笔记)
- Server/cloud storage (designed for but not implemented)
- User accounts / login
