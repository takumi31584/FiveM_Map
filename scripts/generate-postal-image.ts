import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

// Image size (high-res for clarity when zoomed in)
const WIDTH = 8192
const HEIGHT = 8192

// Our CRS.Simple tile grid covers LatLng (0,0) to (-256, 256)
// Coordinate transform: lat = gta_y * 0.0205 - 172.8, lng = gta_x * 0.02072 + 117.3
// So the tile grid in GTA coords:
//   Top-left:     lat=0,    lng=0   → gta_y = 172.8/0.0205 ≈ 8429,  gta_x = -117.3/0.02072 ≈ -5661
//   Bottom-right: lat=-256, lng=256 → gta_y = (-256+172.8)/0.0205 ≈ -4058, gta_x = (256-117.3)/0.02072 ≈ 6693
const GTA_MIN_X = -117.3 / 0.02072
const GTA_MAX_X = (256 - 117.3) / 0.02072
const GTA_MAX_Y = 172.8 / 0.0205       // top of image (Y increases up)
const GTA_MIN_Y = (-256 + 172.8) / 0.0205 // bottom of image

const GTA_WIDTH = GTA_MAX_X - GTA_MIN_X
const GTA_HEIGHT = GTA_MAX_Y - GTA_MIN_Y

function gtaToPixel(x: number, y: number): { px: number; py: number } {
  const px = ((x - GTA_MIN_X) / GTA_WIDTH) * WIDTH
  const py = ((GTA_MAX_Y - y) / GTA_HEIGHT) * HEIGHT // invert Y
  return { px, py }
}

interface PostalEntry {
  x: number
  y: number
  code: string
}

async function main() {
  const postals: PostalEntry[] = JSON.parse(
    readFileSync(join(import.meta.dirname, '../data/ocrp-postals.json'), 'utf-8'),
  )

  console.log(`Generating postal overlay: ${postals.length} codes on ${WIDTH}x${HEIGHT} image`)

  // Build SVG with all postal codes
  const texts = postals.map((p) => {
    const { px, py } = gtaToPixel(p.x, p.y)
    // Skip if outside image bounds
    if (px < 0 || px > WIDTH || py < 0 || py > HEIGHT) return ''
    return `<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" font-size="28" font-weight="bold" fill="#000000" font-family="Arial,sans-serif" text-anchor="middle" dominant-baseline="central">${p.code}</text>`
  }).join('\n')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
${texts}
</svg>`

  const outPath = join(import.meta.dirname, '../public/maps/postal-overlay.png')
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outPath)

  console.log(`Done: ${outPath}`)
}

main().catch(console.error)
