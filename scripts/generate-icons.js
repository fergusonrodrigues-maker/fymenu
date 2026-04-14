const sharp = require("sharp");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#050505"/>
  <text x="256" y="330" font-family="Arial Black, sans-serif" font-size="260" font-weight="900"
        fill="#00ffae" text-anchor="middle" font-style="italic">fy</text>
</svg>
`;

async function generate() {
  for (const size of sizes) {
    const outPath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated icon-${size}x${size}.png`);
  }
  console.log("All icons generated!");
}

generate().catch(console.error);
