/**
 * Gera os ícones do PWA a partir de um SVG desenhado aqui mesmo
 * (os dois bebês + coração, inspirado no logo do mockup).
 *
 *   npm run icons
 *
 * PLACEHOLDER: para usar um ícone próprio, troque os PNGs em public/icons/
 * (192, 512 e as versões maskable) ou edite o desenho em `logoSvg()` abaixo.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

/** Rostinho do bebê: `leo` = touca azul, `clara` = laço rosa. */
function face(variant, cx, cy, r) {
  const leo = variant === 'leo'
  const hair = leo ? '#7cb2f0' : '#f9a8d4'
  const hairDark = leo ? '#4f8fe0' : '#f472b6'
  const s = r / 22 // escala relativa ao desenho base (raio 22)
  const t = (x, y) => `${cx + (x - 32) * s} ${cy + (y - 34) * s}`

  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffe0cc"/>
      <path d="M ${t(10, 32)} A ${22 * s} ${22 * s} 0 0 1 ${t(54, 32)}
               C ${t(54, 33.5)} ${t(53.8, 35)} ${t(53.4, 36.4)}
               C ${t(51.4, 28.4)} ${t(42.8, 23)} ${t(32, 23)}
               C ${t(21.2, 23)} ${t(12.6, 28.4)} ${t(10.6, 36.4)}
               A ${22 * s} ${22 * s} 0 0 1 ${t(10, 32)} Z" fill="${hair}"/>
      <path d="M ${t(32, 10)} C ${t(41.5, 10)} ${t(49.6, 16)} ${t(52.7, 24.4)}
               C ${t(48.3, 18.8)} ${t(40.9, 15.2)} ${t(32, 15.2)}
               C ${t(23.1, 15.2)} ${t(15.7, 18.8)} ${t(11.3, 24.4)}
               C ${t(14.4, 16)} ${t(22.5, 10)} ${t(32, 10)} Z" fill="${hairDark}"/>
      ${
        leo
          ? `<circle cx="${cx}" cy="${cy - 25 * s}" r="${3.4 * s}" fill="${hairDark}"/>`
          : `<circle cx="${cx + 17 * s}" cy="${cy - 16 * s}" r="${4.2 * s}" fill="${hairDark}"/>
             <circle cx="${cx + 22 * s}" cy="${cy - 12 * s}" r="${3.2 * s}" fill="${hairDark}"/>`
      }
      <circle cx="${cx - 8 * s}" cy="${cy + 1 * s}" r="${2.6 * s}" fill="#33404f"/>
      <circle cx="${cx + 8 * s}" cy="${cy + 1 * s}" r="${2.6 * s}" fill="#33404f"/>
      <circle cx="${cx - 14.5 * s}" cy="${cy + 7 * s}" r="${3.6 * s}" fill="#f792b4" opacity="0.75"/>
      <circle cx="${cx + 14.5 * s}" cy="${cy + 7 * s}" r="${3.6 * s}" fill="#f792b4" opacity="0.75"/>
      <path d="M ${t(27.5, 43.5)} C ${t(28.8, 45.3)} ${t(30.5, 46.2)} ${t(32, 46.2)}
               C ${t(33.5, 46.2)} ${t(35.2, 45.3)} ${t(36.5, 43.5)}"
            fill="none" stroke="#33404f" stroke-width="${2.2 * s}" stroke-linecap="round"/>
    </g>`
}

/**
 * @param size      lado do PNG
 * @param maskable  true = mais respiro nas bordas (Android recorta em círculo)
 */
function logoSvg(size, maskable) {
  const S = size
  // O conteúdo ocupa 68% do quadro no maskable e 84% no ícone comum.
  const scale = maskable ? 0.68 : 0.84
  const r = (S * scale) / 5.2
  const cy = S * 0.54
  const gap = r * 0.82

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#ffe8f0"/>
      </linearGradient>
    </defs>
    ${
      maskable
        ? `<rect width="${S}" height="${S}" fill="url(#bg)"/>`
        : `<rect width="${S}" height="${S}" rx="${S * 0.22}" fill="url(#bg)"/>`
    }
    ${face('leo', S / 2 - gap, cy, r)}
    ${face('clara', S / 2 + gap, cy, r)}
    <path d="M ${S / 2} ${S * 0.235}
             c ${-S * 0.055} ${-S * 0.06} ${-S * 0.115} ${-S * 0.012} ${-S * 0.055} ${S * 0.035}
             l ${S * 0.055} ${S * 0.045}
             l ${S * 0.055} ${-S * 0.045}
             c ${S * 0.06} ${-S * 0.047} ${0} ${-S * 0.095} ${-S * 0.055} ${-S * 0.035} Z"
          fill="#f472b6"/>
  </svg>`
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'maskable-192.png', size: 192, maskable: true },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
]

await mkdir(OUT, { recursive: true })

for (const { file, size, maskable } of TARGETS) {
  const svg = logoSvg(size, maskable)
  await sharp(Buffer.from(svg)).png().toFile(resolve(OUT, file))
  console.log(`✓ ${file} (${size}×${size}${maskable ? ', maskable' : ''})`)
}

await writeFile(resolve(OUT, 'favicon.svg'), logoSvg(64, false), 'utf8')
console.log('✓ favicon.svg')
