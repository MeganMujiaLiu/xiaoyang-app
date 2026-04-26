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
    </scroll-view>

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

const DISPLAY_MODES = ['bilingual', 'en', 'zh', 'blank']
const DISPLAY_LABELS = ['双语', '英文', '中文', '隐藏']
const displayModeIndex = ref(0)
const displayMode = computed(() => DISPLAY_MODES[displayModeIndex.value])
const displayModeLabel = computed(() => DISPLAY_LABELS[displayModeIndex.value])

function cycleDisplayMode() {
  displayModeIndex.value = (displayModeIndex.value + 1) % DISPLAY_MODES.length
}

// Speed — playbackRate ref already declared above; just add speedIndex and cycleSpeed
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

function onVideoEnded() {
  playing.value = false
  if (orderMode.value === 'loop-all') {
    videoContext.seek(0)
    videoContext.play()
  }
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

function goToShadowing() {
  videoContext.pause()
  uni.navigateTo({
    url: `/pages/shadowing/index?videoId=${videoId.value}&subtitleId=${subtitleId.value}&lineIndex=${currentLineIndex.value}`
  })
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
.blank-bars { padding: 6rpx 0; }
.grey-bar { height: 28rpx; background: #e0e0e0; border-radius: 6rpx; margin-bottom: 10rpx; }
.grey-bar.long { width: 80%; }
.grey-bar.short { width: 50%; }
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
</style>
