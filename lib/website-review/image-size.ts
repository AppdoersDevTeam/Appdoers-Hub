/** Reads pixel dimensions from a PNG or JPEG buffer header. Returns null for anything else. */
export function readImageSize(buf: Buffer): { width: number; height: number; format: 'png' | 'jpg' } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: 'png' }
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = buf[offset + 1]
      const length = buf.readUInt16BE(offset + 2)
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isSof) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7), format: 'jpg' }
      }
      offset += 2 + length
    }
  }
  return null
}
