import { API_BASE } from './config.js'

export async function getVideos() {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/videos`,
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error(`HTTP ${res.statusCode}`))
      },
      fail: e => reject(new Error(e.errMsg || 'Failed to fetch videos'))
    })
  })
}

export async function getSubtitleLines(episodeId) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/subtitles/${episodeId}`,
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error(`HTTP ${res.statusCode}`))
      },
      fail: e => reject(new Error(e.errMsg || 'Failed to fetch subtitles'))
    })
  })
}
