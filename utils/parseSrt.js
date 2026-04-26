export function parseSrt(content) {
  if (!content || !content.trim()) return []
  return content
    .trim()
    .split(/\r?\n\r?\n/)
    .map(block => {
      const lines = block.trim().split(/\r?\n/)
      if (lines.length < 2) return null
      const index = parseInt(lines[0])
      if (isNaN(index)) return null
      const parts = lines[1].split(' --> ')
      if (parts.length !== 2) return null
      return {
        index,
        startTime: parseTime(parts[0]),
        endTime: parseTime(parts[1]),
        english: lines[2] || '',
        chinese: lines[3] || ''
      }
    })
    .filter(Boolean)
}

function parseTime(str) {
  const [hms, ms] = str.trim().split(',')
  const [h, m, s] = hms.split(':').map(Number)
  return (h * 3600 + m * 60 + s) * 1000 + parseInt(ms)
}
