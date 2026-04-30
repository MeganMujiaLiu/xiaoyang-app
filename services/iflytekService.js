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
