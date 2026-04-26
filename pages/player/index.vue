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

    <!-- Placeholder controls (replaced in Task 8) -->
    <view class="controls-placeholder">
      <text class="ctrl-btn" @click="prevLine">⏮</text>
      <text class="ctrl-btn large" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</text>
      <text class="ctrl-btn" @click="nextLine">⏭</text>
      <text class="mode-btn" @click="cycleDisplayMode">{{ displayModeLabel }}</text>
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
.blank-bars { padding: 6rpx 0; }
.grey-bar { height: 28rpx; background: #e0e0e0; border-radius: 6rpx; margin-bottom: 10rpx; }
.grey-bar.long { width: 80%; }
.grey-bar.short { width: 50%; }
.mode-btn {
  font-size: 26rpx; background: #f0f0f0;
  padding: 8rpx 20rpx; border-radius: 20rpx; color: #555;
}
</style>
