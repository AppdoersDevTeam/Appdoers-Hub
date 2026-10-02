import { describe, expect, it } from 'vitest'
import { readImageSize } from './image-size'

describe('readImageSize', () => {
  it('reads PNG dimensions', () => {
    const buf = Buffer.alloc(32)
    buf.writeUInt32BE(0x89504e47, 0)
    buf.writeUInt32BE(1440, 16)
    buf.writeUInt32BE(900, 20)
    expect(readImageSize(buf)).toEqual({ width: 1440, height: 900, format: 'png' })
  })

  it('reads JPEG SOF0 dimensions after an APP0 segment', () => {
    const buf = Buffer.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, 0x03, 0x00, 0x00,
    ])
    expect(readImageSize(buf)).toEqual({ width: 800, height: 600, format: 'jpg' })
  })

  it('returns null for unknown formats', () => {
    expect(readImageSize(Buffer.from('GIF89a......'))).toBeNull()
  })
})
