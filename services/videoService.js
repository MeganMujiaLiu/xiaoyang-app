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
