/**
 * Generate team Cursor setup PDF — run: npx tsx scripts/generate-cursor-team-guide-pdf.ts
 */
import fs from 'fs'
import path from 'path'
import { renderCursorTeamSetupPdfToBuffer } from '../lib/pdf/render-cursor-team-setup-pdf'

async function main() {
  const outPath = path.join(process.cwd(), 'hub-cursor-kit', 'Cursor-Team-Setup.pdf')
  const buffer = await renderCursorTeamSetupPdfToBuffer()
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, buffer)
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
