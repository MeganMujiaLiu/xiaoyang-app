// iFlytek Spoken Language Evaluation (口语评测) HTTP API
// Fill in your credentials from console.xfyun.cn before using.

const APPID = 'YOUR_APPID'
const API_KEY = 'YOUR_API_KEY'

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

    // X-CheckSum = MD5(API_KEY + curTime + paramBase64)
    // Install crypto-js: npm install crypto-js
    // Then: import CryptoJS from 'crypto-js'
    // And replace the placeholder below with:
    // 'X-CheckSum': CryptoJS.MD5(API_KEY + curTime + paramBase64).toString()
    const checksum = 'REPLACE_WITH_MD5'

    uni.request({
      url: 'https://ise-api.xfyun.cn/v2/open-ise',
      method: 'POST',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Appid': APPID,
        'X-CurTime': curTime,
        'X-Param': paramBase64,
        'X-CheckSum': checksum
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
