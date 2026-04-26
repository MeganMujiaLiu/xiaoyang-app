// Data access layer.
// Local mode: imports from data/ modules.
// Server mode (future): replace getVideos() and getSubtitleLines() with API calls only.

import { VIDEOS } from '../data/videos.js'
import peppaMuddyPuddles from '../data/subtitles/peppa-muddy-puddles.js'

const SUBTITLE_MAP = {
  'peppa-muddy-puddles': peppaMuddyPuddles
}

export async function getVideos() {
  return VIDEOS
}

export async function getSubtitleLines(subtitleId) {
  const lines = SUBTITLE_MAP[subtitleId]
  if (!lines) throw new Error(`Subtitle not found: ${subtitleId}`)
  return lines
}
