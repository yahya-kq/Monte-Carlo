const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function generateSolidGoldCoinSvg() {
  let beads = '';
  for (let i = 0; i < 36; i++) {
    const angle = (i * 10 * Math.PI) / 180;
    const x = 256 + 210 * Math.cos(angle);
    const y = 256 + 210 * Math.sin(angle);
    beads += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="#FFFBEB" opacity="0.95" />\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich 3D Drop Shadow for contrast on both dark and light browser tabs -->
    <filter id="coin-depth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#78350F" flood-opacity="0.5" />
    </filter>

    <!-- Outer Rim Edge (Polished Solid Gold) -->
    <linearGradient id="outer-rim-grad" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="18%" stop-color="#FDE047" />
      <stop offset="45%" stop-color="#F59E0B" />
      <stop offset="75%" stop-color="#B45309" />
      <stop offset="100%" stop-color="#78350F" />
    </linearGradient>

    <!-- 3D Bevel Chamfer -->
    <linearGradient id="bevel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="35%" stop-color="#F59E0B" />
      <stop offset="70%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#78350F" />
    </linearGradient>

    <!-- Coin Face Radial Gold Field -->
    <radialGradient id="face-grad" cx="35%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#FEF9C3" />
      <stop offset="25%" stop-color="#FDE047" />
      <stop offset="55%" stop-color="#F59E0B" />
      <stop offset="85%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#853609" />
    </radialGradient>

    <!-- Recessed Stepped Wall -->
    <linearGradient id="recessed-ring" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#78350F" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#92400E" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#FFFBEB" stop-opacity="0.95" />
    </linearGradient>

    <!-- Embossed Symbol Metallic Gradient -->
    <linearGradient id="symbol-grad" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="20%" stop-color="#FFFBEB" />
      <stop offset="45%" stop-color="#FDE047" />
      <stop offset="75%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#78350F" />
    </linearGradient>

    <filter id="symbol-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="3" dy="8" stdDeviation="5" flood-color="#451A03" flood-opacity="0.85" />
    </filter>
  </defs>

  <!-- 1. Outer Coin Base with Drop Shadow -->
  <circle cx="256" cy="256" r="236" fill="url(#outer-rim-grad)" filter="url(#coin-depth)" />

  <!-- 2. Outer Beveled Rim Ring -->
  <circle cx="256" cy="256" r="226" fill="none" stroke="url(#bevel-grad)" stroke-width="12" />

  <!-- 3. Mint Beading Ring (Golden coin rivets) -->
  <g id="mint-beads">
    ${beads}
  </g>

  <!-- 4. Inner Recessed Coin Field -->
  <circle cx="256" cy="256" r="196" fill="url(#face-grad)" stroke="url(#recessed-ring)" stroke-width="8" />

  <!-- 5. Concentric Mint Ridge -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#FFFBEB" stroke-width="2.5" stroke-opacity="0.8" stroke-dasharray="8 5" />

  <!-- 6. Bold Embossed Solid Dollar Sign with Full Vertical Spine -->
  <g filter="url(#symbol-shadow)">
    <!-- Vertical Spine Bar -->
    <rect x="238" y="80" width="36" height="352" rx="10" fill="url(#symbol-grad)" stroke="#FFFBEB" stroke-width="4" />
    <!-- S Body -->
    <path d="M 336 196 
             C 336 148, 298 130, 256 130 
             C 210 130, 174 148, 174 192 
             C 174 238, 214 252, 256 264 
             C 304 278, 344 294, 344 338 
             C 344 384, 304 406, 256 406 
             C 200 406, 164 380, 162 330 
             L 214 330 
             C 216 356, 234 370, 256 370 
             C 282 370, 302 356, 302 338 
             C 302 298, 258 284, 216 272 
             C 170 258, 132 238, 132 192 
             C 132 144, 172 94, 256 94 
             C 334 94, 376 142, 376 196 
             Z" 
          fill="url(#symbol-grad)" 
          stroke="#FFFBEB" 
          stroke-width="4" />
  </g>

  <!-- 7. Specular Curved Light Reflection across Coin Surface -->
  <path d="M 96 132 
           C 160 82, 282 72, 368 112 
           C 292 98, 166 112, 112 172 
           C 102 158, 98 144, 96 132 Z" 
        fill="#FFFFFF" 
        opacity="0.48" />

  <!-- 8. Brilliant Star Glint on Top Rim -->
  <g transform="translate(132, 126)">
    <path d="M 0 -22 Q 0 0 22 0 Q 0 0 0 22 Q 0 0 -22 0 Q 0 0 0 -22 Z" fill="#FFFFFF" opacity="0.95" />
    <circle cx="0" cy="0" r="4.5" fill="#FEF9C3" />
  </g>
</svg>`;
}

function createIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = 6 + (16 * pngBuffers.length);
  const entries = [];
  const imageDatas = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    const width = item.size >= 256 ? 0 : item.size;
    const height = item.size >= 256 ? 0 : item.size;

    entry.writeUInt8(width, 0);
    entry.writeUInt8(height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);

    offset += item.buffer.length;
    entries.push(entry);
    imageDatas.push(item.buffer);
  }

  return Buffer.concat([header, ...entries, ...imageDatas]);
}

async function run() {
  const svg = generateSolidGoldCoinSvg();
  const publicDir = path.join(__dirname, '..', 'public');
  const appDir = path.join(__dirname, '..', 'src', 'app');

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svg);

  const sizes = [16, 32, 48, 64, 180, 512];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();

    if ([16, 32, 48, 64].includes(size)) {
      pngBuffers.push({ size, buffer: buf });
    }

    if (size === 180) {
      fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), buf);
      fs.writeFileSync(path.join(appDir, 'apple-icon.png'), buf);
    }
    if (size === 32) {
      fs.writeFileSync(path.join(publicDir, 'icon-32.png'), buf);
    }
    if (size === 512) {
      fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buf);
    }
  }

  const icoBuffer = createIco(pngBuffers);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Successfully updated solid gold coin favicon with spine bar!');
}

run().catch(console.error);
