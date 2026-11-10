import * as THREE from 'three';

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

export function opticsPoster() {
  return canvas(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#f3ecdf';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2c4a45';
    ctx.fillRect(0, 0, w, 18);
    ctx.fillRect(0, h - 18, w, 18);
    ctx.fillStyle = '#c6a15b';
    ctx.fillRect(36, 48, 120, 8);

    ctx.fillStyle = '#1c2430';
    font(ctx, 64, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'left';
    ctx.fillText('Bending light', 36, 110);
    font(ctx, 28, 500, 'Inter, Liberation Sans, sans-serif');
    ctx.fillStyle = '#3d4a55';
    ctx.fillText('White light is a stack of colors. A prism sorts them.', 36, 164);

    // incoming lamp
    ctx.fillStyle = '#2a3038';
    round(ctx, 70, 280, 70, 90, 8);
    ctx.fill();
    ctx.fillStyle = '#fff4d2';
    ctx.fillRect(140, 312, 28, 26);

    // beam
    ctx.strokeStyle = '#f7f1de';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(168, 325);
    ctx.lineTo(390, 360);
    ctx.stroke();

    // prism
    ctx.beginPath();
    ctx.moveTo(470, 250);
    ctx.lineTo(400, 470);
    ctx.lineTo(560, 470);
    ctx.closePath();
    ctx.fillStyle = 'rgba(150, 206, 214, 0.85)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2c4a55';
    ctx.stroke();

    const rays = ['#e24b4b', '#f08a2a', '#f2d14a', '#3aaa62', '#3d7fe0'];
    rays.forEach((color, i) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(520, 390);
      ctx.lineTo(760, 250 + i * 58);
      ctx.stroke();
    });

    ctx.fillStyle = '#f7f4ee';
    ctx.strokeStyle = '#2a3038';
    ctx.lineWidth = 6;
    round(ctx, 760, 230, 28, 310, 4);
    ctx.fill();
    ctx.stroke();

    // lens diagram
    ctx.fillStyle = '#1c2430';
    font(ctx, 28, 600, 'Inter, Liberation Sans, sans-serif');
    ctx.fillText('A fat lens gathers rays. A hollow lens spreads them.', 36, 560);
    ctx.strokeStyle = '#2c4a55';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(250, 650, 18, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#d08a3a';
    ctx.lineWidth = 6;
    [[210, 620, 360, 650], [210, 680, 360, 650], [250, 650, 420, 650]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.fillStyle = '#d08a3a';
    ctx.beginPath();
    ctx.arc(360, 650, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5c6a72';
    font(ctx, 22, 500, 'Inter, Liberation Sans, sans-serif');
    ctx.fillText('Click the glass on the bench to swing the fan.', 520, 690);
  });
}

export function solarPoster() {
  return canvas(1280, 768, (ctx, w, h) => {
    ctx.fillStyle = '#142033';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6a15b';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.fillStyle = '#f4efe4';
    font(ctx, 58, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'left';
    ctx.fillText('The neighborhood', 48, 78);
    font(ctx, 24, 500, 'Inter, Liberation Sans, sans-serif');
    ctx.fillStyle = '#c5d0dc';
    ctx.fillText('Six worlds on one tilted table. Click a sphere to name it.', 48, 122);

    const cx = 860;
    const cy = 430;
    const orbits = [70, 110, 155, 205, 270, 340];
    ctx.strokeStyle = 'rgba(198,161,91,0.55)';
    ctx.lineWidth = 2;
    orbits.forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.42, -0.2, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    const planets = [
      ['#d5d0c6', 70, 0.2, 'Mercury'],
      ['#ead7a4', 110, 1.1, 'Venus'],
      ['#4c93d4', 155, 2.2, 'Earth'],
      ['#d15a3c', 205, 3.4, 'Mars'],
      ['#e0b888', 270, 4.3, 'Jupiter'],
      ['#f0e0b8', 340, 5.2, 'Saturn'],
    ];
    planets.forEach(([color, r, a, name], i) => {
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.42;
      const rad = 8 + i * 2.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      if (name === 'Saturn') {
        ctx.strokeStyle = '#f0e0b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y, rad + 8, rad * 0.4, 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#f4efe4';
      font(ctx, 20, 600, 'Inter, Liberation Sans, sans-serif');
      ctx.textAlign = 'left';
      ctx.fillText(name, 56, 210 + i * 72);
      ctx.fillStyle = color;
      ctx.fillRect(28, 196 + i * 72, 16, 16);
    });
  });
}

export function cellPoster() {
  return canvas(1024, 720, (ctx, w, h) => {
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f6a45';
    ctx.fillRect(0, 0, 18, h);
    ctx.fillStyle = '#1c2430';
    font(ctx, 52, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'left';
    ctx.fillText('A green cell', 48, 78);
    font(ctx, 24, 500, 'Inter, Liberation Sans, sans-serif');
    ctx.fillStyle = '#3e5348';
    ctx.fillText('Every leaf is a workshop. This one makes sugar from light.', 48, 128);

    round(ctx, 80, 180, 560, 470, 80);
    ctx.fillStyle = '#d9efc8';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2f6a45';
    ctx.stroke();

    ctx.fillStyle = 'rgba(244, 248, 236, 0.85)';
    ctx.beginPath();
    ctx.ellipse(360, 430, 150, 110, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8aaa78';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#7a4a8a';
    ctx.beginPath();
    ctx.arc(300, 340, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e6f4';
    ctx.beginPath();
    ctx.arc(314, 328, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2f8a48';
    [[470, 300, 70, 28], [500, 390, 64, 26], [180, 470, 76, 30], [430, 500, 58, 24]].forEach(([x, y, rw, rh]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rh, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    const notes = [
      [700, 250, 'wall — a firm jacket'],
      [700, 340, 'nucleus — the library'],
      [700, 450, 'green grains catch light'],
      [700, 560, 'vacuole — a water tank'],
    ];
    ctx.fillStyle = '#1c2430';
    font(ctx, 24, 600, 'Inter, Liberation Sans, sans-serif');
    notes.forEach(([x, y, text]) => {
      ctx.fillStyle = '#c6a15b';
      ctx.fillRect(x - 28, y - 6, 16, 8);
      ctx.fillStyle = '#1c2430';
      ctx.fillText(text, x, y);
    });
  });
}

export function moonPoster() {
  return canvas(1280, 420, (ctx, w, h) => {
    ctx.fillStyle = '#1b2636';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4efe4';
    font(ctx, 40, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'left';
    ctx.fillText('Moon this month', 36, 58);
    const names = ['new', 'crescent', 'quarter', 'gibbous', 'full', 'gibbous', 'quarter', 'crescent'];
    for (let i = 0; i < 8; i++) {
      const x = 110 + i * 150;
      const y = 210;
      const r = 48;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#f4efe2';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#243044';
      if (i === 0) ctx.fillRect(x - r, y - r, r * 2, r * 2);
      else if (i === 2) ctx.fillRect(x - r, y - r, r, r * 2);
      else if (i === 6) ctx.fillRect(x, y - r, r, r * 2);
      else if (i === 1) {
        ctx.beginPath();
        ctx.arc(x - 18, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === 7) {
        ctx.beginPath();
        ctx.arc(x + 18, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === 3) {
        ctx.beginPath();
        ctx.arc(x - 30, y, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === 5) {
        ctx.beginPath();
        ctx.arc(x + 30, y, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#c6a15b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d5dbe3';
      font(ctx, 18, 600, 'Inter, Liberation Sans, sans-serif');
      ctx.textAlign = 'center';
      ctx.fillText(names[i], x, 300);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9aabbb';
    font(ctx, 20, 500, 'Inter, Liberation Sans, sans-serif');
    ctx.fillText('The same face, a moving shadow. Nothing here is a forecast.', 36, 370);
  });
}

export function chalkBoard() {
  return canvas(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#24382e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d7e2cf';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = '#e7f2e4';
    font(ctx, 54, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'left';
    ctx.fillText('Today on the floor', 64, 110);
    font(ctx, 36, 500, 'Inter, Liberation Sans, sans-serif');
    const lines = [
      '1   Name the blue world',
      '2   Swing the glass prism',
      '3   Shelve one specimen',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 72, 230 + i * 100));
    ctx.beginPath();
    ctx.arc(860, 420, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(860, 420, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function floorMap() {
  return canvas(640, 640, (ctx, w, h) => {
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
    ctx.fillStyle = '#efe6d4';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6d5138';
    ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = '#1c2430';
    font(ctx, 36, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'center';
    ctx.fillText('Find a bench', w / 2, 72);

    const zones = [
      [48, 110, 200, 360, '#314555', 'Optics'],
      [260, 110, 250, 180, '#1e2a3a', 'Planets'],
      [260, 300, 250, 170, '#c4a06a', 'Workshop'],
      [520, 110, 90, 360, '#8ea394', 'Stores'],
    ];
    zones.forEach(([x, y, zw, zh, color, name]) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, zw, zh);
      ctx.fillStyle = '#f7f3ea';
      font(ctx, 22, 700, 'Inter, Liberation Sans, sans-serif');
      ctx.fillText(name, x + zw / 2, y + zh / 2);
    });
    ctx.fillStyle = '#e24b4b';
    ctx.beginPath();
    ctx.arc(390, 520, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2430';
    font(ctx, 20, 600, 'Inter, Liberation Sans, sans-serif');
    ctx.fillText('you are here', w / 2, 580);
  });
}

export function zoneCard(title, line) {
  return canvas(768, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c6a15b';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = '#1c2430';
    font(ctx, 72, 700, 'Liberation Serif, serif');
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 150);
    font(ctx, 32, 500, 'Inter, Liberation Sans, sans-serif');
    ctx.fillStyle = '#3d4a55';
    ctx.fillText(line, w / 2, 250);
  });
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
