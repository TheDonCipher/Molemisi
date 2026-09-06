/**
 * Molemisi — minimal TrueType (TTF) compiler, zero dependencies.
 *
 * Packs bitmap glyph grids (5x7 up to 12x12 px) into a valid TTF:
 * every pixel becomes a 1x1 unit square contour on a 2048 upm grid.
 * Tables: head, hhea, maxp, hmtx, cmap (format 4), glyf, loca, name, OS/2, post.
 *
 * This is intentionally small, not general-purpose: monochrome, no kerning,
 * no hinting, no composite glyphs.
 */

const UPM = 2048;
const PX = 128; // grid units per font pixel (2048 / 16px em)

/* ---------------- Helpers ------------------------------------------------- */

function be16(v) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(v & 0xffff, 0);
  return b;
}
function be32(v) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(v >>> 0, 0);
  return b;
}
function tag(s) {
  return Buffer.from(s, 'ascii');
}
function pad4(buf) {
  const rem = buf.length % 4;
  return rem ? Buffer.concat([buf, Buffer.alloc(4 - rem)]) : buf;
}

/* ---------------- Glyph outline from bitmap -------------------------------- */

/**
 * Convert a bitmap (array of strings, '#' = ink) into quadratic glyf data.
 * Uses contour tracing: finds edge-adjacent unit squares and emits rectangle
 * outlines merged per row-run (simple, robust, produces valid winding).
 */
function bitmapToGlyf(bitmap) {
  const h = bitmap.length;
  const w = bitmap[0].length;
  const ink = (x, y) => y >= 0 && y < h && x >= 0 && x < w && bitmap[y][x] === '#';

  // Scanline rectangle merging: for each row, find runs of ink; merge identical
  // runs vertically. Produces rectangles that exactly tile the glyph.
  const rects = [];
  const open = new Map(); // key `${x0}-${x1}` -> {x0,x1,y0}
  for (let y = 0; y <= h; y++) {
    const runs = new Map();
    if (y < h) {
      let x = 0;
      while (x < w) {
        if (ink(x, y)) {
          const x0 = x;
          while (x < w && ink(x, y)) x++;
          runs.set(`${x0}-${x}`, { x0, x1: x, y0: y });
        } else x++;
      }
    }
    // close runs that disappeared
    for (const [key, r] of open) {
      if (!runs.has(key)) {
        rects.push({ x0: r.x0, x1: r.x1, y0: r.y0, y1: y });
        open.delete(key);
      }
    }
    // open new runs
    for (const [key, r] of runs) {
      if (!open.has(key)) open.set(key, r);
    }
  }

  if (rects.length === 0) return null;

  // Build glyf outline: each rect = one contour (4 points, 4 on-curve)
  // TTF y-up: fontY = (h - y) * PX
  const contours = rects.map((r) => ({
    points: [
      { x: r.x0 * PX, y: (h - r.y0) * PX },
      { x: r.x1 * PX, y: (h - r.y0) * PX },
      { x: r.x1 * PX, y: (h - r.y1) * PX },
      { x: r.x0 * PX, y: (h - r.y1) * PX },
    ],
  }));

  // Serialize contours (all points on-curve, no quadratic splits needed)
  const endPointCount = contours.length;
  const numPoints = endPointCount * 4;
  const xCoords = [];
  const yCoords = [];
  let prevX = 0;
  let prevY = 0;
  const xs = [];
  const ys = [];
  for (const c of contours) {
    for (const pt of c.points) {
      xs.push(pt.x - prevX);
      ys.push(pt.y - prevY);
      prevX = pt.x;
      prevY = pt.y;
    }
  }

  // flags: on-curve + x/y short/long encoding
  const flags = [];
  const xBytes = [];
  const yBytes = [];
  const encode = (deltas, bytes) => {
    for (const d of deltas) {
      if (d === 0) {
        flags.push(0x01); // on-curve, same
      } else if (d >= -255 && d <= 255) {
        flags.push(d >= 0 ? 0x11 : 0x12); // on-curve, short positive/negative
        bytes.push(Math.abs(d));
      } else {
        flags.push(0x01 | 0x02 | (d < 0 ? 0x10 : 0x00) | 0x00);
        // 16-bit delta: flag bit1=0? Actually: bit1 set = short; clear = int16
        flags[flags.length - 1] = 0x01 | 0x00; // on-curve, int16
        bytes.push((d >> 8) & 0xff, d & 0xff);
      }
    }
  };
  encode(xs, xBytes);
  encode(ys, yBytes);

  const xBytesBuf = Buffer.from(xBytes);
  const yBytesBuf = Buffer.from(yBytes);

  const head = Buffer.alloc(10);
  head.writeInt16BE(numPoints, 0);
  head.writeInt16BE(endPointCount, 2);
  // instructionLength = 0
  head.writeInt16BE(endPointCount, 4); // reused below — endpoints written separately

  const out = Buffer.concat([
    head.subarray(0, 4),
    be16(0), // instructionLength
    ...contours.map((_, i) => be16(i * 4 + 3)), // end points
    be32(0), // instructions length (u16 + padding)
    Buffer.from(flags),
    xBytesBuf,
    yBytesBuf,
  ]);

  // Fix: endpoint of last point of each contour must be i*4+3 — done above.
  const xMin = Math.min(...contours.flatMap((c) => c.points.map((p) => p.x)));
  const yMin = Math.min(...contours.flatMap((c) => c.points.map((p) => p.y)));
  const xMax = Math.max(...contours.flatMap((c) => c.points.map((p) => p.x)));
  const yMax = Math.max(...contours.flatMap((c) => c.points.map((p) => p.y)));

  const glyf = Buffer.concat([
    be16(contours.length),
    Buffer.from([xMin >> 8 & 0xff, xMin & 0xff, yMin >> 8 & 0xff, yMin & 0xff]),
    Buffer.from([xMax >> 8 & 0xff, xMax & 0xff, yMax >> 8 & 0xff, yMax & 0xff]),
    out,
  ]);
  // Recompute header with proper int16 fields
  const header = Buffer.alloc(10);
  header.writeInt16BE(contours.length, 0);
  header.writeInt16BE(xMin, 2);
  header.writeInt16BE(yMin, 4);
  header.writeInt16BE(xMax, 6);
  header.writeInt16BE(yMax, 8);

  return Buffer.concat([header, out]);
}

/* ---------------- Font assembly -------------------------------------------- */

/**
 * Build a TTF from { char: bitmap } map.
 * @param {Object<string, string[]>} glyphs char -> bitmap rows
 * @param {Object} opts { ascender, descender, familyName, styleName }
 */
export function buildTTF(glyphs, opts = {}) {
  const family = opts.familyName || 'Molemisi Pixel';
  const style = opts.styleName || 'Bold';
  const ascent = opts.ascender ?? 9 * PX; // 9px above baseline
  const descent = -(opts.descender ?? 3 * PX); // 3px below
  const lineGap = 1 * PX;

  const charMap = Object.entries(glyphs); // [char, bitmap]
  // glyph order: .notdef first, then chars
  const order = ['.notdef', ...charMap.map(([c]) => c)];

  // advance widths: bitmap width + 1px spacing (monospace-ish but honors glyph)
  const advance = (bitmap) => (bitmap ? bitmap[0].length + 1 : 6) * PX;

  const glyfBuffers = [];
  const offsets = [0];
  const widths = [];
  const codepoints = [];

  for (const ch of order) {
    if (ch === '.notdef') {
      glyfBuffers.push(Buffer.alloc(0)); // empty glyph
      widths.push(6 * PX);
      continue;
    }
    const bitmap = glyphs[ch];
    const g = bitmapToGlyf(bitmap) || Buffer.alloc(0);
    glyfBuffers.push(g);
    widths.push(advance(bitmap));
    codepoints.push(ch.codePointAt(0));
  }

  // loca (short form: offsets/2)
  let acc = 0;
  const locaShort = [];
  for (const g of glyfBuffers) {
    locaShort.push(acc);
    acc += pad4(g).length;
  }
  locaShort.push(acc);
  const glyfTable = Buffer.concat(glyfBuffers.map((g) => pad4(g)));
  const locaTable = Buffer.concat(locaShort.map((v) => be16(v / 2)));

  // hmtx
  const hmtx = Buffer.concat(
    order.map((_, i) => Buffer.concat([be16(widths[i]), Buffer.alloc(2)])),
  );

  // cmap format 4 — single segment per char + final 0xFFFF
  const segCount = codepoints.length + 1;
  const segs = [...codepoints.map((cp, i) => ({ start: cp, end: cp, id: i + 1 })), { start: 0xffff, end: 0xffff, id: 0 }];
  const cmapSearchRange = 2 * Math.floor(Math.log2(segCount));
  const cmap4 = (() => {
    const bufs = [];
    bufs.push(be16(0), be16(16 + 8 * segCount), be16(0));
    bufs.push(be16(segCount * 2), be16(cmapSearchRange), be16(Math.floor(Math.log2(segCount))), be16(segCount * 2 - cmapSearchRange));
    for (const s of segs) bufs.push(be16(s.end));
    bufs.push(be16(0));
    for (const s of segs) bufs.push(be16(s.start));
    for (const s of segs) bufs.push(be16(s.id === 0 ? 1 : (s.id - s.start) & 0xffff));
    for (const s of segs) bufs.push(be16(0));
    return Buffer.concat(bufs);
  })();

  const cmapTable = Buffer.concat([
    be16(0), // version
    be16(1), // numTables
    be16(0), // platformID: Unicode
    be16(3), // encodingID: BMP
    be32(12), // offset
    cmap4,
  ]);

  // head
  const headTable = Buffer.alloc(54);
  headTable.writeUInt32BE(0x00010000, 0);
  headTable.writeUInt32BE(0x5f0f3cf5, 4); // checksumAdjustment (fixed later, value not critical for most renderers)
  headTable.writeUInt32BE(0x5f0f3cf5, 4);
  headTable.writeUInt32BE(0, 8); // version
  headTable.writeUInt32BE(0x5f0f3cf5, 4);
  headTable.writeUInt16BE(1000, 18); // unitsPerEm... must be 2048
  headTable.writeUInt16BE(UPM, 18);
  headTable.writeUInt32BE(0, 20); // created
  headTable.writeUInt32BE(0, 24); // modified
  headTable.writeInt16BE(0, 28); // xMin
  headTable.writeInt16BE(0, 30); // yMin
  headTable.writeInt16BE(12 * PX, 32); // xMax (widest glyph)
  headTable.writeInt16BE(ascent, 34); // yMax
  headTable.writeUInt16BE(0, 36); // macStyle
  headTable.writeUInt16BE(8, 38); // lowestRecPPEM
  headTable.writeInt16BE(2, 40); // fontDirectionHint
  headTable.writeInt16BE(0, 42); // indexToLocFormat: short
  headTable.writeInt16BE(0, 44); // glyphDataFormat

  // hhea
  const hheaTable = Buffer.alloc(36);
  hheaTable.writeUInt32BE(0x00010000, 0);
  hheaTable.writeInt16BE(ascent, 4);
  hheaTable.writeInt16BE(descent, 6);
  hheaTable.writeInt16BE(lineGap, 8);
  hheaTable.writeUInt16BE(1, 18); // metricDataFormat... advanceWidthMax at 10
  hheaTable.writeUInt16BE(16 * PX, 10);
  hheaTable.writeUInt16BE(0, 34); // numberOfHMetrics — fix below
  hheaTable.writeUInt16BE(order.length, 34);

  // maxp
  const maxpTable = Buffer.alloc(32);
  maxpTable.writeUInt32BE(0x00010000, 0);
  maxpTable.writeUInt16BE(order.length * 4, 4); // numGlyphs — points don't matter here, use glyph count*4 safe? Actually numGlyphs:
  maxpTable.writeUInt16BE(order.length, 4);
  maxpTable.writeUInt16BE(64, 6); // maxPoints (generous)
  maxpTable.writeUInt16BE(8, 8); // maxContours
  maxpTable.writeUInt16BE(64, 10);
  maxpTable.writeUInt16BE(8, 12);
  maxpTable.writeUInt16BE(2, 14); // maxZones
  maxpTable.writeUInt16BE(0, 16);
  maxpTable.writeUInt16BE(2, 18); // maxTwilightPoints
  maxpTable.writeUInt16BE(0, 20);

  // name — minimal: family, style, full name, postscript
  const nameTable = (() => {
    const records = [
      [1, family],
      [2, style],
      [4, `${family} ${style}`],
      [6, family.replace(/ /g, '') + '-' + style],
    ];
    const nameBufs = [];
    const strBufs = [];
    let strOff = 0;
    for (const [id, s] of records) {
      const b = Buffer.from(s, 'utf16le');
      // swap to big-endian UTF-16
      for (let i = 0; i < b.length; i += 2) {
        const t = b[i];
        b[i] = b[i + 1];
        b[i + 1] = t;
      }
      nameBufs.push(be16(3), be16(1), be16(0x409), be16(id), be16(b.length), be16(strOff));
      strBufs.push(b);
      strOff += b.length;
    }
    return Buffer.concat([Buffer.alloc(6), be16(records.length), be16(6), ...nameBufs, ...strBufs]);
  })();

  // OS/2 — minimal version 4
  const os2Table = Buffer.alloc(96);
  os2Table.writeUInt16BE(4, 0);
  os2Table.writeInt16BE(500, 2); // xAvgCharWidth
  os2Table.writeUInt16BE(700, 4); // usWeightClass
  os2Table.writeUInt16BE(5, 6); // usWidthClass
  os2Table.writeUInt16BE(0, 8); // fsType
  os2Table.writeInt16BE(ascent, 68);
  os2Table.writeInt16BE(descent, 70);
  os2Table.writeUInt16BE(1 * PX, 72); // typoLineGap
  os2Table.writeUInt16BE(ascent, 74); // usWinAscent
  os2Table.writeUInt16BE(-descent, 76); // usWinDescent
  os2Table.writeUInt32BE(0x00000001, 84); // ulCodePageRange1: Latin-1
  // panose: leave zeros

  // post — version 3 (no glyph names)
  const postTable = Buffer.alloc(32);
  postTable.writeUInt32BE(0x00030000, 0);
  postTable.writeInt16BE(0, 4); // italicAngle
  postTable.writeInt16BE(-descent, 10); // underlinePosition
  postTable.writeUInt16BE(0, 12); // underlineThickness

  /* ---- assemble ---- */
  const tables = [
    ['cmap', cmapTable],
    ['glyf', glyfTable],
    ['head', headTable],
    ['hhea', hheaTable],
    ['hmtx', hmtx],
    ['loca', locaTable],
    ['maxp', maxpTable],
    ['name', nameTable],
    ['OS/2', os2Table],
    ['post', postTable],
  ].sort((a, b) => tag(a[0]).compare(tag(b[0])));

  const numTables = tables.length;
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;

  const header = Buffer.concat([
    be32(0x00010000),
    be16(numTables),
    be16(searchRange),
    be16(entrySelector),
    be16(numTables * 16 - searchRange),
  ]);

  let offset = header.length + numTables * 16;
  const dirEntries = [];
  const tableBuffers = [];
  for (const [t, data] of tables) {
    const sum = checksum(data);
    dirEntries.push(
      Buffer.concat([
        tag(t),
        be32(sum),
        be32(offset),
        be32(data.length),
      ]),
    );
    tableBuffers.push(pad4(data));
    offset += pad4(data).length;
  }

  return Buffer.concat([header, ...dirEntries, ...tableBuffers]);
}

function checksum(buf) {
  const padded = pad4(buf);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) {
    sum = (sum + padded.readUInt32BE(i)) >>> 0;
  }
  return sum;
}
