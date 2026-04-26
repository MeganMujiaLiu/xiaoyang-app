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
