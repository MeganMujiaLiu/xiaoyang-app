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
    const onStop = res => { rm.offStop(onStop); rm.offError(onError); resolve(res.tempFilePath) }
    const onError = e => { rm.offStop(onStop); rm.offError(onError); reject(new Error(e.errMsg || 'Recording failed')) }
    rm.onStop(onStop)
    rm.onError(onError)
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
