// World News in One Day: 22 November 2026
// Original newspaper front page renderer. Node 22, stdlib only, no network.
// Draws a 1024x1024 front page and writes /output/entry.png.
// Deterministic: no timestamps, no randomness, fixed zlib level.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

const PAPER: [number, number, number] = [246, 241, 229];
const INK: [number, number, number] = [17, 17, 17];
const RED: [number, number, number] = [163, 22, 33];
const BLUE: [number, number, number] = [29, 53, 87];
const GREY: [number, number, number] = [92, 88, 78];

type RGB = [number, number, number];
const img = Buffer.alloc(W * H * 3);

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    img[i * 3] = c[0];
    img[i * 3 + 1] = c[1];
    img[i * 3 + 2] = c[2];
  }
}
function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function hRule(x: number, y: number, w: number, t: number, c: RGB): void {
  rect(x, y, w, t, c);
}
function vRule(x: number, y: number, h: number, t: number, c: RGB): void {
  rect(x, y, t, h, c);
}
function box(x: number, y: number, w: number, h: number, c: RGB): void {
  hRule(x, y, w, 2, c);
  hRule(x, y + h - 2, w, 2, c);
  vRule(x, y, h, 2, c);
  vRule(x + w - 2, y, h, 2, c);
}

// ---- 5x7 bitmap font (own design, uppercase + digits + punctuation) ----
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "\u2022": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
};

function normChar(ch: string): string {
  if (ch === "\u2019" || ch === "\u2018") return "'";
  if (ch === "\u2014" || ch === "\u2013") return "-";
  return ch;
}
function textWidth(text: string, s: number): number {
  return text.length * 6 * s - s;
}
function drawChar(x: number, y: number, ch: string, s: number, c: RGB): void {
  const g = FONT[normChar(ch)] ?? FONT[" "];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") rect(x + col * s, y + r * s, s, s, c);
    }
  }
}
function drawText(x: number, y: number, text: string, s: number, c: RGB): void {
  const up = text.toUpperCase();
  for (let i = 0; i < up.length; i++) drawChar(x + i * 6 * s, y, up[i], s, c);
}
function drawTextCentered(cx: number, y: number, text: string, s: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(text.toUpperCase(), s) / 2), y, text, s, c);
}
function wrapText(text: string, maxW: number, s: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, s) <= maxW || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(x: number, y: number, text: string, s: number, maxW: number, c: RGB, pitch: number): number {
  const lines = wrapText(text, maxW, s);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * pitch, lines[i], s, c);
  return y + lines.length * pitch;
}

// ---- globe motif: filled circle with meridian / parallel lines ----
function globe(cx: number, cy: number, r: number): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let x = cx - dx; x <= cx + dx; x++) px(x, cy + dy, BLUE);
  }
  // meridians + parallels in paper colour, clipped to the disc
  const inside = (x: number, y: number): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };
  for (let y = cy - r; y <= cy + r; y++) {
    if (inside(cx, y)) px(cx, y, PAPER);
    if (inside(cx - Math.floor(r * 0.55), y)) px(cx - Math.floor(r * 0.55), y, PAPER);
    if (inside(cx + Math.floor(r * 0.55), y)) px(cx + Math.floor(r * 0.55), y, PAPER);
  }
  for (let x = cx - r; x <= cx + r; x++) {
    if (inside(x, cy)) px(x, cy, PAPER);
    if (inside(x, cy - Math.floor(r * 0.55))) px(x, cy - Math.floor(r * 0.55), PAPER);
    if (inside(x, cy + Math.floor(r * 0.55))) px(x, cy + Math.floor(r * 0.55), PAPER);
  }
  // outline ring
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), INK);
  }
}

// ---- PNG encoder (own implementation, zlib from stdlib) ----
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    img.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- page layout ----
function drawPage(): void {
  fill(PAPER);

  // Masthead
  hRule(28, 16, 968, 3, INK);
  drawTextCentered(512, 28, "World News in One Day", 2, GREY);
  drawTextCentered(512, 54, "SUNDAY 22 NOVEMBER 2026", 6, INK);
  hRule(28, 104, 968, 3, INK);
  drawTextCentered(512, 114, "Antalya \u2022 Cikande \u2022 Tehran \u2022 Wellington \u2022 Turin", 2, GREY);
  hRule(28, 134, 968, 2, INK);
  hRule(28, 138, 968, 2, INK);

  // Lead story (left)
  drawText(28, 152, "LEAD — CLIMATE", 2, RED);
  drawText(28, 180, "COP31 COLLAPSES", 5, INK);
  drawText(28, 228, "NO DEAL IN ANTALYA", 5, INK);
  drawPara(28, 282, "After two days in overtime, the closing plenary rejects the final draft. No consensus, no deal adopted.", 2, 556, INK, 18);
  drawPara(
    28, 346,
    "COP31 president Murat Kurum: \"There is no consensus on this document. Therefore, these decisions have not been adopted.\"",
    2, 556, INK, 18,
  );
  drawPara(
    28, 410,
    "The draft never mentioned fossil fuels, oil, coal or phase-out. It was the first COP text to admit peak warming will exceed 1.5 degrees, and set a 35% electrification goal by 2035.",
    2, 556, INK, 18,
  );
  globe(520, 520, 30);
  drawTextCentered(520, 556, "ANTALYA", 1, GREY);

  // Divider between lead and right column
  vRule(592, 150, 410, 2, INK);

  // Right column: Indonesia
  drawText(608, 152, "INDONESIA", 2, RED);
  drawText(608, 174, "CANDY FACTORY FIRE", 3, INK);
  drawText(608, 198, "3 DEAD, 36 MISSING", 3, INK);
  drawPara(
    608, 226,
    "Fire at the Fonusa Agung Mulia candy factory in Cikande: 3 killed, 36 missing.",
    2, 388, INK, 18,
  );
  hRule(608, 294, 388, 2, INK);

  // Right column: Iran / Gulf
  drawText(608, 308, "IRAN / GULF", 2, RED);
  drawText(608, 330, "TRUMP SEEKS", 3, INK);
  drawText(608, 354, "'PERMANENT' DEAL", 3, INK);
  drawPara(
    608, 382,
    "Araghchi: reopening Hormuz 'not difficult' if the US accepts Tehran's terms.",
    2, 388, INK, 18,
  );
  hRule(608, 448, 388, 2, INK);

  // Right column: United States
  drawText(608, 462, "UNITED STATES", 2, RED);
  drawText(608, 484, "FBI HACK CONFIRMED", 3, INK);
  drawPara(
    608, 508,
    "The FBI database hack is confirmed; the president sees a 'possible positive spin'.",
    2, 388, INK, 18,
  );

  // Bottom band: 3 x 2 panels
  const panels: { x: number; y: number; label: string; head: string; body: string }[] = [
    { x: 28, y: 575, label: "SPORT", head: "India pile up 720/9 in Wellington", body: "A 352-run lead over New Zealand in the first Test. Leeds beat Chelsea 4-1, first win at the Bridge since 1999." },
    { x: 356, y: 575, label: "TECHNOLOGY", head: "Amazon nears $7.5B deal for AI start-up Decart", body: "IBM unveils the 520-qubit 'Nighthawk r3' quantum chip." },
    { x: 684, y: 575, label: "NEPAL", head: "Nepal PM begins state visit to India", body: "Balendra Shah starts a two-day state visit to New Delhi." },
    { x: 28, y: 782, label: "GAZA", head: "Israeli strikes continue in Gaza", body: "An aid vehicle is hit as strikes continue across the Strip." },
    { x: 356, y: 782, label: "TENNIS — ATP FINALS", head: "Alcaraz faces Zverev in ATP Finals title match", body: "The title match in Turin is tonight. No result yet at press time." },
    { x: 684, y: 782, label: "ESTONIA", head: "Estonia to shut border with Russia", body: "Moscow calls the move a new Iron Curtain. Cyclone Akvan aftermath: flights cancelled at Ranchi airport." },
  ];
  for (const p of panels) {
    box(p.x, p.y, 312, 193, INK);
    drawText(p.x + 12, p.y + 12, p.label, 2, RED);
    const hy = drawPara(p.x + 12, p.y + 34, p.head, 2, 288, INK, 18);
    drawPara(p.x + 12, hy + 6, p.body, 2, 288, GREY, 18);
    drawText(p.x + 12, p.y + 172, "Reported 22 Nov 2026", 1, GREY);
  }

  // Footer
  hRule(28, 986, 968, 2, INK);
  drawTextCentered(512, 994, "All stories first reported on Sunday 22 November 2026 — Sources: Reuters and wire reports", 1, GREY);
}

drawPage();
fs.mkdirSync("/output", { recursive: true });
fs.writeFileSync("/output/entry.png", encodePNG());
console.log("wrote /output/entry.png");
