import { parseSrt } from '../parseSrt'

describe('parseSrt', () => {
  it('parses a bilingual SRT block', () => {
    const srt = `1
00:00:01,000 --> 00:00:03,500
Peppa likes to look after her little brother, George.
佩奇喜欢照顾她的弟弟乔治

2
00:00:04,000 --> 00:00:05,200
George,
好了乔治`
    const result = parseSrt(srt)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      index: 1,
      startTime: 1000,
      endTime: 3500,
      english: 'Peppa likes to look after her little brother, George.',
      chinese: '佩奇喜欢照顾她的弟弟乔治'
    })
    expect(result[1]).toEqual({
      index: 2,
      startTime: 4000,
      endTime: 5200,
      english: 'George,',
      chinese: '好了乔治'
    })
  })

  it('handles missing Chinese translation', () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nHello world`
    const result = parseSrt(srt)
    expect(result[0].english).toBe('Hello world')
    expect(result[0].chinese).toBe('')
  })

  it('parses timestamps with hours correctly', () => {
    const srt = `1\n01:33:52,861 --> 01:34:00,500\ntest\n测试`
    const result = parseSrt(srt)
    // 1h 33m 52s 861ms = (3600 + 33*60 + 52)*1000 + 861 = 5632861
    expect(result[0].startTime).toBe(5632861)
    // 1h 34m 0s 500ms = (3600 + 34*60 + 0)*1000 + 500 = 5640500
    expect(result[0].endTime).toBe(5640500)
  })

  it('handles Windows CRLF line endings', () => {
    const srt = "1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n世界\r\n\r\n"
    const result = parseSrt(srt)
    expect(result).toHaveLength(1)
    expect(result[0].english).toBe('Hello')
    expect(result[0].chinese).toBe('世界')
  })

  it('returns empty array for empty input', () => {
    expect(parseSrt('')).toEqual([])
    expect(parseSrt('   ')).toEqual([])
  })
})
