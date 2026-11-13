import * as THREE from 'three';

const SERIF = 'Liberation Serif, serif';
const SANS = 'Inter, Liberation Sans, sans-serif';

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function font(ctx, size, weight, family) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textBaseline = 'middle';
}

function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const ROWS = [
  { key: 'anchor', name: 'ANCHOR', color: '#1e4e86' },
  { key: 'gull', name: 'GULL', color: '#d15a42' },
  { key: 'lantern', name: 'LANTERN', color: '#e2a23a' },
];

function icon(ctx, key, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(4, s * 0.08);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (key === 'anchor') {
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.lineTo(0, s * 0.34);
    ctx.moveTo(-s * 0.28, s * 0.02);
    ctx.lineTo(s * 0.28, s * 0.02);
    ctx.moveTo(0, s * 0.34);
    ctx.quadraticCurveTo(-s * 0.36, s * 0.34, -s * 0.28, s * 0.02);
    ctx.moveTo(0, s * 0.34);
    ctx.quadraticCurveTo(s * 0.36, s * 0.34, s * 0.28, s * 0.02);
    ctx.stroke();
  } else if (key === 'gull') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, s * 0.05);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.32, 0, -s * 0.02);
    ctx.quadraticCurveTo(s * 0.1, -s * 0.32, s * 0.42, s * 0.05);
    ctx.stroke();
  } else {
    ctx.strokeRect(-s * 0.16, -s * 0.08, s * 0.32, s * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.08);
    ctx.lineTo(0, -s * 0.36);
    ctx.moveTo(-s * 0.14, -s * 0.22);
    ctx.lineTo(s * 0.18, -s * 0.22);
    ctx.stroke();
    ctx.fillRect(-s * 0.08, s * 0.02, s * 0.16, s * 0.16);
  }
  ctx.restore();
}

export function tideChart(digits) {
  return canvas(1024, 1280, (ctx, w, h) => {
    ctx.fillStyle = '#f6f0e2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e4e86';
    ctx.lineWidth = 18;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.strokeStyle = '#c6a15b';
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 42, w - 84, h - 84);

    ctx.fillStyle = '#1c2430';
    font(ctx, 108, 700, SERIF);
    ctx.textAlign = 'center';
    ctx.fillText('TIDE LOCK', w / 2, 160);
    font(ctx, 36, 500, SANS);
    ctx.fillStyle = '#3e4c55';
    ctx.fillText('Three marks. One harbor.', w / 2, 230);

    ROWS.forEach((row, i) => {
      const y = 390 + i * 230;
      ctx.fillStyle = row.color;
      round(ctx, 90, y - 70, 84, 84, 12);
      ctx.fill();
      ctx.strokeStyle = '#1c2430';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = '#f7f1e4';
      ctx.fillStyle = '#f7f1e4';
      icon(ctx, row.key, 132, y - 28, 70);

      ctx.fillStyle = '#1c2430';
      ctx.textAlign = 'left';
      font(ctx, 54, 700, SANS);
      ctx.fillText(row.name, 210, y - 28);
      ctx.textAlign = 'right';
      font(ctx, 140, 700, SERIF);
      ctx.fillStyle = row.color;
      ctx.fillText(String(digits[row.key]), w - 110, y - 10);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#3e4c55';
    font(ctx, 30, 500, SANS);
    ctx.fillText('The slate copies the chart. The wheels copy the slate.', w / 2, 1120);
    ctx.fillText('The lantern cabinet keeps the key.', w / 2, 1170);
  });
}

export function keeperSlate(digits) {
  return canvas(1280, 860, (ctx, w, h) => {
    ctx.fillStyle = '#f3ecdc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e7dcc4';
    for (let y = 180; y < h - 40; y += 86) ctx.fillRect(48, y, w - 96, 2);

    ctx.fillStyle = '#1e4e86';
    ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = '#1c2430';
    font(ctx, 64, 700, SERIF);
    ctx.textAlign = 'left';
    ctx.fillText("Keeper's copy", 56, 90);
    font(ctx, 28, 500, SANS);
    ctx.fillStyle = '#5c5144';
    ctx.fillText('Copied off the chart. Do not invent a fourth mark.', 56, 142);

    ROWS.forEach((row, i) => {
      const y = 280 + i * 170;
      ctx.fillStyle = row.color;
      ctx.fillRect(64, y - 36, 28, 72);
      ctx.fillStyle = '#1c2430';
      font(ctx, 48, 650, SANS);
      ctx.textAlign = 'left';
      ctx.fillText(row.name, 120, y);
      ctx.textAlign = 'right';
      font(ctx, 92, 700, SERIF);
      ctx.fillStyle = row.color;
      ctx.fillText(String(digits[row.key]), w - 80, y);
    });
  });
}

export function deskLog(digits) {
  return canvas(1280, 900, (ctx, w, h) => {
    ctx.fillStyle = '#f7f1e4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eadfca';
    ctx.fillRect(0, 0, 36, h);
    for (let y = 150; y < h - 30; y += 64) {
      ctx.fillStyle = '#e4d3b8';
      ctx.fillRect(60, y, w - 100, 2);
    }
    ctx.fillStyle = '#8a3a3a';
    ctx.fillRect(70, 48, w - 130, 8);

    ctx.fillStyle = '#1c2430';
    font(ctx, 54, 700, SERIF);
    ctx.textAlign = 'left';
    ctx.fillText('Night log', 78, 110);
    font(ctx, 34, 500, SANS);
    ctx.fillStyle = '#3c4650';
    const lines = [
      'The chart names the wheels.',
      'The wheels name the cabinets.',
      `Anchor ${digits.anchor}    Gull ${digits.gull}    Lantern ${digits.lantern}`,
      'Open the lantern door for the key.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 78, 230 + i * 130));
  });
}

export function entryCard() {
  return canvas(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e4e86';
    ctx.lineWidth = 16;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#1c2430';
    font(ctx, 84, 700, SERIF);
    ctx.textAlign = 'center';
    ctx.fillText('TIDE LOCK', w / 2, 220);
    font(ctx, 40, 500, SANS);
    ctx.fillStyle = '#3e4c55';
    const lines = [
      'Read the chart on the easel.',
      'Check the keeper’s slate.',
      'Set the wheels to match.',
      'The floor strip leads there.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, w / 2, 400 + i * 110));
  });
}

export function jarTag(name, digit, color) {
  return canvas(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f7f1e4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 28, h);
    ctx.fillStyle = '#1c2430';
    font(ctx, 42, 700, SANS);
    ctx.textAlign = 'center';
    ctx.fillText(name, w / 2 + 8, 80);
    font(ctx, 110, 700, SERIF);
    ctx.fillStyle = color;
    ctx.fillText(String(digit), w / 2 + 8, 175);
  });
}

export function dialFace(digit, color) {
  return canvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f4efe2';
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.fillStyle = '#f7f3ea';
    font(ctx, 260, 700, SERIF);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(digit), w / 2, h / 2 + 16);
  });
}

export function seaView() {
  return canvas(1024, 768, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#d5e7f2');
    sky.addColorStop(1, '#f3e2c4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7fbfc6';
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.fillStyle = '#5aa7b0';
    for (let i = 0; i < 5; i++) ctx.fillRect(0, h * 0.64 + i * 36, w, 8);
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(w * 0.72, h * 0.28, 36, h * 0.32);
    ctx.beginPath();
    ctx.moveTo(w * 0.7, h * 0.28);
    ctx.lineTo(w * 0.738, h * 0.08);
    ctx.lineTo(w * 0.776, h * 0.28);
    ctx.fill();
    ctx.fillStyle = '#e2a23a';
    ctx.beginPath();
    ctx.arc(w * 0.738, h * 0.2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c2430';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(180, h * 0.5);
    ctx.quadraticCurveTo(260, h * 0.36, 340, h * 0.48);
    ctx.moveTo(300, h * 0.5);
    ctx.quadraticCurveTo(380, h * 0.38, 470, h * 0.5);
    ctx.stroke();
  });
}

export function floorRose() {
  return canvas(1024, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1f4f58';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 470, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c6a15b';
    ctx.lineWidth = 28;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 360, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f4efe4';
    font(ctx, 120, 700, SERIF);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', w / 2, 150);
    ctx.fillStyle = '#e2a23a';
    ctx.beginPath();
    ctx.moveTo(w / 2, 250);
    ctx.lineTo(w / 2 - 48, 430);
    ctx.lineTo(w / 2 + 48, 430);
    ctx.fill();
    ctx.fillStyle = '#f4efe4';
    font(ctx, 64, 700, SANS);
    ctx.fillText('TO THE', w / 2, 620);
    ctx.fillText('WHEELS', w / 2, 710);
  });
}

export function mapSheet() {
  return canvas(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#e7f0ea';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e4e86';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = '#7fbfc6';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(80, 520);
    ctx.bezierCurveTo(280, 180, 620, 600, 940, 220);
    ctx.stroke();
    ctx.fillStyle = '#1c2430';
    font(ctx, 48, 700, SERIF);
    ctx.textAlign = 'left';
    ctx.fillText('Harbor reach', 48, 80);
    font(ctx, 28, 500, SANS);
    ctx.fillStyle = '#3e4c55';
    ctx.fillText('The lock sits on the back wall.', 48, 140);
  });
}
