/**
 * Run once with: node scripts/generate-icons.mjs
 * Requires Node 18+ (uses built-in Canvas via --experimental-vm-modules is NOT needed;
 * this script uses the `canvas` npm package if available, otherwise falls back to
 * writing SVG files that modern browsers accept in manifests).
 *
 * If you have the `canvas` package: npm install canvas --save-dev
 * then run: node scripts/generate-icons.mjs
 *
 * Otherwise the SVG fallback icons are written automatically.
 */
import { createCanvas } from "canvas"
import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "../public/icons")
mkdirSync(OUT, { recursive: true })

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")
  const pad = size * 0.08

  // Background
  ctx.fillStyle = "#111111"
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.18)
  ctx.fill()

  // Green checkmark circle
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.34

  ctx.strokeStyle = "#4ade80"
  ctx.lineWidth = size * 0.06
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Checkmark
  ctx.strokeStyle = "#4ade80"
  ctx.lineWidth = size * 0.07
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.45, cy)
  ctx.lineTo(cx - r * 0.1, cy + r * 0.4)
  ctx.lineTo(cx + r * 0.5, cy - r * 0.35)
  ctx.stroke()

  return canvas.toBuffer("image/png")
}

try {
  for (const size of [192, 512]) {
    const buf = drawIcon(size)
    writeFileSync(join(OUT, `icon-${size}.png`), buf)
    console.log(`✓ icon-${size}.png`)
  }
  console.log("Icons generated in public/icons/")
} catch (err) {
  console.error("canvas package not available — writing SVG fallback icons instead.")
  writeSVGFallbacks()
}

function writeSVGFallbacks() {
  const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#111111"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.34}" stroke="#4ade80" stroke-width="${size*0.06}" fill="none"/>
  <polyline points="${size*0.28},${size*0.5} ${size*0.45},${size*0.67} ${size*0.72},${size*0.37}"
    stroke="#4ade80" stroke-width="${size*0.07}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`

  mkdirSync(OUT, { recursive: true })
  for (const size of [192, 512]) {
    writeFileSync(join(OUT, `icon-${size}.svg`), svg(size))
    console.log(`✓ icon-${size}.svg (SVG fallback)`)
  }
  console.log('\nUpdate manifest.json icon types to "image/svg+xml" and src to "/icons/icon-NNN.svg"')
}
