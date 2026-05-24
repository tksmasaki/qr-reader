import sharp from "sharp";
import { writeFileSync } from "fs";

// 128x128 ベース SVG（QRコード風デザイン）
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <!-- 背景 -->
  <rect width="128" height="128" rx="20" fill="#1E1E2E"/>

  <!-- 左上コーナーマーカー（外枠） -->
  <rect x="14" y="14" width="38" height="38" rx="4" fill="none" stroke="white" stroke-width="6"/>
  <!-- 左上コーナーマーカー（内枠） -->
  <rect x="24" y="24" width="18" height="18" rx="2" fill="white"/>

  <!-- 右上コーナーマーカー（外枠） -->
  <rect x="76" y="14" width="38" height="38" rx="4" fill="none" stroke="white" stroke-width="6"/>
  <!-- 右上コーナーマーカー（内枠） -->
  <rect x="86" y="24" width="18" height="18" rx="2" fill="white"/>

  <!-- 左下コーナーマーカー（外枠） -->
  <rect x="14" y="76" width="38" height="38" rx="4" fill="none" stroke="white" stroke-width="6"/>
  <!-- 左下コーナーマーカー（内枠） -->
  <rect x="24" y="86" width="18" height="18" rx="2" fill="white"/>

  <!-- 右下エリアのドットパターン -->
  <rect x="76" y="76" width="8" height="8" rx="1" fill="white"/>
  <rect x="90" y="76" width="8" height="8" rx="1" fill="white"/>
  <rect x="104" y="76" width="8" height="8" rx="1" fill="white"/>
  <rect x="76" y="90" width="8" height="8" rx="1" fill="white"/>
  <rect x="104" y="90" width="8" height="8" rx="1" fill="white"/>
  <rect x="76" y="104" width="8" height="8" rx="1" fill="white"/>
  <rect x="90" y="104" width="8" height="8" rx="1" fill="white"/>
  <rect x="104" y="104" width="8" height="8" rx="1" fill="white"/>

  <!-- 中央のドットパターン -->
  <rect x="56" y="56" width="8" height="8" rx="1" fill="white"/>
  <rect x="70" y="42" width="8" height="8" rx="1" fill="white"/>
  <rect x="56" y="42" width="8" height="8" rx="1" fill="white"/>
  <rect x="42" y="56" width="8" height="8" rx="1" fill="white"/>
  <rect x="42" y="70" width="8" height="8" rx="1" fill="white"/>
  <rect x="70" y="70" width="8" height="8" rx="1" fill="white"/>
</svg>`;

const sizes = [16, 48, 128];

for (const size of sizes) {
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(`public/icon${size}.png`, buffer);
  console.log(`生成: public/icon${size}.png`);
}
