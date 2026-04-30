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
              :class="['action-btn', 'record-btn', { recording: isRecording, disabled: isBusy }]"
              @click.stop="!isBusy && toggleRecord()"
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
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSubtitleLines } from '../../services/videoService.js'
import { startRecording, stopRecording, playAudio } from '../../services/recordingService.js'
import { scorePronunciation } from '../../services/iflytekService.js'

const videoId = ref('')
const subtitleId = ref('')
const videoUrl = ref('')
const activeIndex = ref(0)
const subtitleLines = ref([])
const isRecording = ref(false)
const isBusy = ref(false)
const recordings = ref({})   // lineIndex → tempFilePath
const scores = ref({})       // lineIndex → 0-100 (populated by Task 11)

let videoContext = null
let pendingRecording = null  // promise from startRecording()
let listenTimer = null

onLoad(async options => {
  videoId.value = options.videoId
  subtitleId.value = options.subtitleId
  videoUrl.value = decodeURIComponent(options.videoUrl || '')
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
  if (listenTimer !== null) {
    clearTimeout(listenTimer)
    listenTimer = null
  }
  activeIndex.value = i
  seekToActive()
}

function previewLine() {
  listenOriginal()
}

function listenOriginal() {
  const line = subtitleLines.value[activeIndex.value]
  if (!line || !videoContext) return
  if (listenTimer !== null) {
    clearTimeout(listenTimer)
    listenTimer = null
  }
  videoContext.seek(line.startTime / 1000)
  videoContext.play()
  const duration = line.endTime - line.startTime
  listenTimer = setTimeout(() => {
    videoContext.pause()
    listenTimer = null
  }, duration)
}

async function toggleRecord() {
  if (isBusy.value) return
  if (isRecording.value) {
    isBusy.value = true
    isRecording.value = false
    stopRecording()
    try {
      const filePath = await pendingRecording
      recordings.value = { ...recordings.value, [activeIndex.value]: filePath }
      await playAudio(filePath)
      const line = subtitleLines.value[activeIndex.value]
      scorePronunciation(filePath, line.english)
        .then(score => { scores.value = { ...scores.value, [activeIndex.value]: score } })
        .catch(() => { scores.value = { ...scores.value, [activeIndex.value]: 0 } })
    } finally {
      isBusy.value = false
    }
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
