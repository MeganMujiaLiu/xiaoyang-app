import { getVideos, getSubtitleLines } from '../../services/videoService'

describe('videoService', () => {
  it('returns a non-empty list of videos', async () => {
    const videos = await getVideos()
    expect(videos.length).toBeGreaterThan(0)
    expect(videos[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      videoUrl: expect.any(String),
      subtitleId: expect.any(String),
      duration: expect.any(Number)
    })
  })

  it('returns subtitle lines for a valid subtitleId', async () => {
    const lines = await getSubtitleLines('peppa-muddy-puddles')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0]).toMatchObject({
      index: expect.any(Number),
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      english: expect.any(String),
      chinese: expect.any(String)
    })
  })

  it('throws for an unknown subtitleId', async () => {
    await expect(getSubtitleLines('unknown-id')).rejects.toThrow('Subtitle not found: unknown-id')
  })
})
