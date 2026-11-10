/** Authored 2D surfaces for the north-light studio. Flat shapes so toon banding stays legible. */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function floorTexture() {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  const planks = 8;
  const pw = c.width / planks;
  const tones = ['#a67c52', '#b48962', '#9a7048', '#c0966c', '#8d6240', '#b88960', '#a47850', '#c4a078'];
  for (let i = 0; i < planks; i++) {
    g.fillStyle = tones[i % tones.length];
    g.fillRect(i * pw, 0, pw + 1, c.height);
    g.fillStyle = 'rgba(70,40,20,0.18)';
    g.fillRect(i * pw, 0, 2, c.height);
    const rand = mulberry32(100 + i * 17);
    g.strokeStyle = 'rgba(90,55,30,0.15)';
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      const x = i * pw + 6 + rand() * (pw - 12);
      g.moveTo(x, 0);
      g.bezierCurveTo(x + rand() * 6 - 3, 160, x + rand() * 8 - 4, 320, x + rand() * 4 - 2, 512);
      g.stroke();
    }
  }
  // butt joints so the repeat does not read as one endless board
  g.fillStyle = 'rgba(60,36,18,0.28)';
  for (let i = 0; i < planks; i++) {
    const y = (i % 2 === 0) ? 250 : 80;
    g.fillRect(i * pw + 1, y, pw - 2, 3);
  }
  return c;
}

export function plasterTexture() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#f3eee6';
  g.fillRect(0, 0, 256, 256);
  const rand = mulberry32(7);
  for (let i = 0; i < 1800; i++) {
    const v = 220 + Math.floor(rand() * 28);
    g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.18)`;
    g.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  return c;
}

export function corkTexture() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#b58958';
  g.fillRect(0, 0, 256, 256);
  const rand = mulberry32(21);
  for (let i = 0; i < 900; i++) {
    const v = 120 + Math.floor(rand() * 70);
    g.fillStyle = `rgba(${v},${Math.floor(v * 0.72)},${Math.floor(v * 0.4)},0.45)`;
    g.beginPath();
    g.arc(rand() * 256, rand() * 256, 1 + rand() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export function tileTexture() {
  const c = canvas(256, 160);
  const g = c.getContext('2d');
  const tw = 64;
  const th = 40;
  g.fillStyle = '#e7eeea';
  g.fillRect(0, 0, c.width, c.height);
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * (tw / 2);
    for (let col = -1; col < 5; col++) {
      const x = col * tw + offset;
      const y = row * th;
      const shift = ((row + col) % 3) * 4;
      g.fillStyle = `rgb(${206 + shift},${214 + shift},${210 + shift})`;
      g.fillRect(x + 2, y + 2, tw - 4, th - 4);
    }
  }
  return c;
}

export function clothTexture() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#e6dcc8';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(150,120,80,0.25)';
  g.lineWidth = 2;
  for (let y = 18; y < 256; y += 28) {
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + 8, 160, y - 6, 256, y + 3);
    g.stroke();
  }
  // hem
  g.strokeStyle = '#cbb892';
  g.lineWidth = 8;
  g.strokeRect(6, 6, 244, 244);
  // a few studio stains, not a splatter field
  g.fillStyle = 'rgba(140,70,40,0.35)';
  g.beginPath();
  g.ellipse(70, 180, 16, 9, 0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(40,70,120,0.28)';
  g.beginPath();
  g.ellipse(190, 90, 10, 7, -0.3, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function splatterTexture() {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  const rand = mulberry32(44);
  const colors = ['#b42318', '#1e3f8f', '#d39a2a', '#1c6a4a', '#f4f1ea'];
  for (let i = 0; i < 70; i++) {
    g.fillStyle = colors[i % colors.length];
    g.globalAlpha = 0.55 + rand() * 0.4;
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1.5 + rand() * 5;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.5 + rand()), rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

/** Hero canvas: the bottle-and-cloth still life that sits on the plinth. */
export function paintingStillLife() {
  const c = canvas(320, 440);
  const g = c.getContext('2d');
  g.fillStyle = '#c5d0d8';
  g.fillRect(0, 0, 320, 440);
  g.fillStyle = '#e7eef5';
  g.fillRect(18, 16, 110, 150);
  g.fillStyle = '#aeb9c4';
  g.fillRect(230, 0, 90, 270);
  g.fillStyle = '#8d5e3c';
  g.fillRect(0, 268, 320, 172);
  g.fillStyle = '#6e432c';
  g.fillRect(0, 268, 320, 10);
  // cloth
  g.fillStyle = '#e4d8c4';
  g.beginPath();
  g.moveTo(40, 300);
  g.lineTo(250, 286);
  g.lineTo(280, 360);
  g.lineTo(70, 400);
  g.closePath();
  g.fill();
  g.fillStyle = '#cfc3ad';
  g.beginPath();
  g.moveTo(70, 400);
  g.lineTo(150, 330);
  g.lineTo(120, 300);
  g.fill();
  // bottle, highlight on the left (window side)
  g.fillStyle = '#6d8a78';
  g.fillRect(128, 150, 46, 150);
  g.fillRect(138, 112, 26, 42);
  g.fillStyle = '#d7e6de';
  g.fillRect(132, 160, 8, 90);
  g.fillStyle = '#3e554c';
  g.fillRect(166, 250, 28, 8);
  // fruit
  g.fillStyle = '#e2b23a';
  g.beginPath();
  g.arc(214, 292, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f0d48a';
  g.beginPath();
  g.arc(204, 284, 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#8a6230';
  g.fillRect(212, 262, 4, 12);
  return c;
}

/** Back easel: a seated figure blocked in planes, not a portrait of anyone. */
export function paintingFigure() {
  const c = canvas(320, 440);
  const g = c.getContext('2d');
  g.fillStyle = '#e6d2b0';
  g.fillRect(0, 0, 320, 440);
  g.fillStyle = '#f7f4ee';
  g.fillRect(16, 28, 52, 200);
  g.fillStyle = '#d5c4a4';
  g.fillRect(16, 120, 52, 14);
  g.fillStyle = '#c4a888';
  g.fillRect(0, 300, 320, 140);
  // chair
  g.fillStyle = '#6b4632';
  g.fillRect(118, 210, 16, 150);
  g.fillRect(210, 210, 16, 150);
  g.fillRect(110, 188, 124, 16);
  // coat
  g.fillStyle = '#3c4d66';
  g.fillRect(132, 168, 96, 130);
  g.fillStyle = '#2c3a50';
  g.fillRect(196, 180, 22, 100);
  // head
  g.fillStyle = '#2c241e';
  g.fillRect(150, 78, 62, 28);
  g.fillStyle = '#e0b89a';
  g.fillRect(154, 100, 54, 62);
  g.fillStyle = '#c4927a';
  g.fillRect(190, 118, 14, 28);
  // arm
  g.fillStyle = '#31405a';
  g.fillRect(118, 200, 28, 18);
  g.fillStyle = '#e0b89a';
  g.fillRect(96, 196, 26, 20);
  return c;
}

/** Front easel: the north window itself, the thing the room is built around. */
export function paintingWindow() {
  const c = canvas(320, 440);
  const g = c.getContext('2d');
  g.fillStyle = '#e7e0d4';
  g.fillRect(0, 0, 320, 440);
  g.fillStyle = '#d8cfc0';
  g.fillRect(0, 300, 320, 140);
  g.fillStyle = '#f4f1ea';
  g.fillRect(36, 28, 248, 280);
  const panes = ['#d5e4f0', '#eef4f8', '#c5d6e6', '#e4eef6'];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      g.fillStyle = panes[(row + col) % panes.length];
      g.fillRect(48 + col * 76, 42 + row * 84, 66, 74);
    }
  }
  // sill and a pot, the same galvanized pot that stands in the room
  g.fillStyle = '#cfc4b0';
  g.fillRect(36, 292, 248, 16);
  g.fillStyle = '#5c656c';
  g.fillRect(188, 248, 36, 46);
  g.fillStyle = '#3f6a46';
  g.beginPath();
  g.arc(206, 240, 22, 0, Math.PI * 2);
  g.fill();
  return c;
}

function paper(g, w, h) {
  g.fillStyle = '#f4ecd8';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e4d8c0';
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function jitterLine(g, rand, x0, y0, x1, y1) {
  g.beginPath();
  g.moveTo(x0, y0);
  const mx = (x0 + x1) / 2 + (rand() - 0.5) * 10;
  const my = (y0 + y1) / 2 + (rand() - 0.5) * 10;
  g.quadraticCurveTo(mx, my, x1, y1);
  g.stroke();
}

export function sketchSheet(kind) {
  const c = canvas(280, 360);
  const g = c.getContext('2d');
  paper(g, 280, 360);
  const rand = mulberry32(kind.length * 97 + 3);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#2a2622';
  g.lineWidth = 2.4;

  if (kind === 'gesture') {
    g.lineWidth = 3;
    jitterLine(g, rand, 150, 40, 150, 90);
    jitterLine(g, rand, 150, 90, 90, 150);
    jitterLine(g, rand, 150, 90, 210, 160);
    jitterLine(g, rand, 150, 150, 120, 250);
    jitterLine(g, rand, 150, 150, 190, 260);
    g.beginPath();
    g.arc(150, 28, 16, 0, Math.PI * 2);
    g.stroke();
    // stool
    g.lineWidth = 1.6;
    g.strokeRect(100, 250, 90, 8);
    g.strokeRect(112, 258, 6, 50);
    g.strokeRect(172, 258, 6, 50);
  } else if (kind === 'value') {
    g.fillStyle = '#2a2622';
    g.fillRect(30, 40, 70, 110);
    g.fillStyle = '#6d675f';
    g.fillRect(110, 40, 70, 110);
    g.fillStyle = '#b7b1a6';
    g.fillRect(190, 40, 60, 110);
    g.strokeStyle = '#2a2622';
    g.strokeRect(40, 190, 200, 130);
    g.beginPath();
    g.moveTo(40, 320);
    g.lineTo(140, 190);
    g.lineTo(240, 320);
    g.stroke();
  } else if (kind === 'profile') {
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(90, 60);
    g.quadraticCurveTo(70, 120, 100, 160);
    g.quadraticCurveTo(130, 200, 110, 250);
    g.quadraticCurveTo(180, 270, 200, 180);
    g.quadraticCurveTo(230, 120, 180, 70);
    g.quadraticCurveTo(140, 30, 90, 60);
    g.stroke();
    g.beginPath();
    g.arc(150, 120, 4, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'window') {
    g.strokeRect(40, 30, 200, 240);
    g.beginPath();
    g.moveTo(140, 30);
    g.lineTo(140, 270);
    g.moveTo(40, 110);
    g.lineTo(240, 110);
    g.moveTo(40, 190);
    g.lineTo(240, 190);
    g.stroke();
    g.fillStyle = '#d5e2ee';
    g.fillRect(46, 36, 88, 68);
    g.font = '24px sans-serif';
    g.fillStyle = '#2a2622';
    g.fillText('cool', 48, 320);
  } else if (kind === 'bottle') {
    g.lineWidth = 2.6;
    g.strokeRect(120, 70, 40, 30);
    g.strokeRect(108, 100, 64, 170);
    g.beginPath();
    g.moveTo(70, 300);
    g.quadraticCurveTo(140, 250, 230, 310);
    g.stroke();
    g.beginPath();
    g.arc(200, 250, 22, 0, Math.PI * 2);
    g.stroke();
  } else if (kind === 'hands') {
    g.lineWidth = 2.2;
    for (const ox of [40, 150]) {
      g.beginPath();
      g.moveTo(ox + 20, 260);
      g.quadraticCurveTo(ox, 180, ox + 30, 80);
      g.stroke();
      for (let f = 0; f < 4; f++) {
        jitterLine(g, rand, ox + 30, 90, ox + 20 + f * 18, 40 + (f % 2) * 16);
      }
    }
  } else if (kind === 'perspective') {
    g.beginPath();
    g.moveTo(40, 260);
    g.lineTo(200, 300);
    g.lineTo(250, 180);
    g.lineTo(90, 140);
    g.closePath();
    g.moveTo(90, 140);
    g.lineTo(70, 70);
    g.lineTo(230, 100);
    g.lineTo(250, 180);
    g.moveTo(70, 70);
    g.lineTo(40, 160);
    g.lineTo(40, 260);
    g.stroke();
  } else if (kind === 'notes') {
    g.font = '28px ui-sans-serif, sans-serif';
    g.fillStyle = '#2a2622';
    g.fillText('north light', 24, 70);
    g.fillText('bottle left', 24, 120);
    g.fillText('cloth cool', 24, 170);
    g.fillText('shadow right', 24, 220);
    g.strokeStyle = '#b42318';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(24, 250);
    g.lineTo(120, 250);
    g.stroke();
  } else if (kind === 'color') {
    const sw = [
      ['#b42318', 'Cd'],
      ['#1e3f8f', 'UB'],
      ['#d39a2a', 'YO'],
      ['#1c6a4a', 'Vir'],
    ];
    sw.forEach((s, i) => {
      const y = 30 + i * 80;
      g.fillStyle = s[0];
      g.fillRect(24, y, 90, 60);
      g.fillStyle = '#2a2622';
      g.font = '28px ui-sans-serif, sans-serif';
      g.fillText(s[1], 130, y + 40);
    });
  } else {
    g.strokeRect(40, 40, 180, 240);
    g.beginPath();
    g.moveTo(40, 160);
    g.lineTo(220, 80);
    g.stroke();
  }
  return c;
}

export function labelTexture(text, chip) {
  const c = canvas(256, 96);
  const g = c.getContext('2d');
  g.fillStyle = '#f7f1e4';
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = chip;
  g.fillRect(0, 0, 28, 96);
  g.fillStyle = '#2a241c';
  g.font = 'bold 40px ui-sans-serif, sans-serif';
  g.fillText(text, 44, 62);
  return c;
}
