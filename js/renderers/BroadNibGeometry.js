// Broad-edge (chisel) nib geometry, shared by the canvas renderer and the SVG
// exporter so what you see is exactly what gets printed.
//
// A broad nib is a line segment of width `w` held at an angle θ. Dragging it
// sweeps a ribbon: between two consecutive samples the nib edges form a quad.
// The union of those quads is the stroke — thick where the motion is
// perpendicular to the nib, hairline where it runs along it.
//
// Units are whatever the input points use (the Gótica page uses millimetres).
class BroadNibGeometry {
  static build(rawPoints, settings, seed = 1) {
    const size = Math.max(0.01, Number(settings.size) || 1);
    const step = Math.max(0.05, size * (Number(settings.resolution) || 0.06));
    const points = BroadNibGeometry.resample(BroadNibGeometry.ensureLength(rawPoints, settings), step);
    const copies = Math.max(1, Math.round(Number(settings.nibCount) || 1));
    const center = (copies - 1) / 2;
    const fills = new Map();
    const outlines = [];
    const rungs = [];
    const nodes = [];
    const spine = [];

    if (points.length < 2) return { fills: [], outlines, rungs, nodes, spine };

    const nibs = points.map((p) => BroadNibGeometry.nibAt(p, settings, size, seed));

    for (let copy = 0; copy < copies; copy += 1) {
      const offset = (copy - center) * (Number(settings.nibGap) || 0) * size;
      const fade = center === 0 ? 0 : Math.abs(copy - center) / center;
      const alpha = BroadNibGeometry.clamp01(Number(settings.alpha ?? 1) * (1 - (Number(settings.nibFade) || 0) * fade));
      const edges = nibs.map((nib) => BroadNibGeometry.edgesAt(nib, offset));
      let run = [];

      const flushRun = () => {
        if (run.length >= 2 && settings.outline) {
          const a = run.map((i) => edges[i].a);
          const b = run.map((i) => edges[i].b).reverse();
          outlines.push({ color: BroadNibGeometry.colorAt(settings, nibs[run[0]].s), alpha, points: [...a, ...b] });
        }
        run = [];
      };

      for (let i = 0; i < nibs.length; i += 1) {
        if (!nibs[i].visible) {
          flushRun();
          continue;
        }
        // A shard boundary also breaks the ribbon, even if both sides are visible.
        if (run.length && nibs[run[run.length - 1]].shard !== nibs[i].shard) flushRun();
        run.push(i);

        if (run.length >= 2 && settings.fill !== false) {
          const prev = edges[run[run.length - 2]];
          const curr = edges[i];
          const color = BroadNibGeometry.colorAt(settings, nibs[i].s);
          const key = `${copy}|${color}`;

          if (!fills.has(key)) fills.set(key, { color, alpha, quads: [] });
          fills.get(key).quads.push(BroadNibGeometry.orient([prev.a, prev.b, curr.b, curr.a]));
        }
      }
      flushRun();

      if (settings.graph && copy === Math.round(center)) {
        const every = Math.max(1, Math.round(Number(settings.graphDensity) || 6));

        for (let i = 0; i < nibs.length; i += 1) {
          if (!nibs[i].visible) continue;
          spine.push([nibs[i].x, nibs[i].y]);

          if (i % every === 0) {
            const e = edges[i];
            rungs.push([e.a[0], e.a[1], e.b[0], e.b[1]]);
            nodes.push([nibs[i].x, nibs[i].y]);
          }
        }
      }
    }

    return { fills: [...fills.values()], outlines, rungs, nodes, spine };
  }

  // A tap with no movement still leaves the nib's mark: a short chisel stamp.
  static ensureLength(points, settings) {
    if (!points?.length) return [];
    const first = points[0];
    const moved = points.some((p) => Math.hypot(p.x - first.x, p.y - first.y) > 1e-6);

    if (moved) return points;

    const angle = BroadNibGeometry.radians(Number(settings.nibAngle) || 0);
    const len = (Number(settings.size) || 1) * 0.35;

    return [first, { ...first, x: first.x + Math.sin(angle) * len, y: first.y + Math.cos(angle) * len }];
  }

  // Catmull-Rom through the raw samples, re-sampled every `step` units of arc.
  static resample(points, step) {
    if (points.length < 2) return points.map((p) => ({ ...p, s: 0 }));

    const out = [{ ...points[0], s: 0 }];
    let s = 0;
    const n = points.length;

    for (let i = 0; i < n - 1; i += 1) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(n - 1, i + 2)];
      const segment = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const subdivisions = Math.max(1, Math.ceil(segment / step));

      for (let j = 1; j <= subdivisions; j += 1) {
        const t = j / subdivisions;
        const q = BroadNibGeometry.catmullRom(p0, p1, p2, p3, t);
        const last = out[out.length - 1];
        s += Math.hypot(q.x - last.x, q.y - last.y);
        out.push({
          x: q.x,
          y: q.y,
          s,
          pressure: BroadNibGeometry.lerpMaybe(p1.pressure, p2.pressure, t, 0.5),
          azimuth: BroadNibGeometry.lerpMaybe(p1.azimuth, p2.azimuth, t, null)
        });
      }
    }

    return out;
  }

  static nibAt(p, settings, size, seed) {
    let angle = BroadNibGeometry.radians(Number(settings.nibAngle) || 0);

    // Follow the stylus: the nib turns with the pen's azimuth (impossible to keep
    // a real nib's edge aligned like this while writing).
    if (settings.followPen && Number.isFinite(p.azimuth)) angle += -p.azimuth;

    const drift = BroadNibGeometry.radians(Number(settings.driftAmplitude) || 0);
    const period = Math.max(1, Number(settings.driftPeriod) || 1);
    angle += drift * Math.sin((2 * Math.PI * p.s) / period);

    const pressure = BroadNibGeometry.responsePressure(p.pressure, settings);
    angle += BroadNibGeometry.radians(Number(settings.pressureTwist) || 0) * (pressure - 0.5) * 2;

    const minScale = Number(settings.pressureMinScale) || 1;
    const maxScale = Number(settings.pressureMaxScale) || 1;
    const width = size * (settings.pressureEnabled === false ? 1 : minScale + (maxScale - minScale) * pressure);

    let x = p.x;
    let y = p.y;
    let visible = true;
    let shard = 0;

    if (settings.fracture) {
      const length = Math.max(size * 0.25, Number(settings.fractureLength) || size * 3);
      shard = Math.floor(p.s / length);
      const local = p.s - shard * length;
      visible = local <= length * (1 - BroadNibGeometry.clamp01(Number(settings.fractureGap) || 0));

      const rand = BroadNibGeometry.random(seed * 7919 + shard * 104729);
      const shift = (Number(settings.fractureShift) || 0) * size;
      x += (rand() - 0.5) * 2 * shift;
      y += (rand() - 0.5) * 2 * shift;
      angle += BroadNibGeometry.radians(Number(settings.fractureRotate) || 0) * (rand() - 0.5) * 2;
    }

    return { x, y, s: p.s, angle, width, visible, shard };
  }

  // Nib endpoints for one parallel copy, offset perpendicular to the nib edge.
  static edgesAt(nib, offset) {
    const ux = Math.cos(nib.angle);
    const uy = -Math.sin(nib.angle); // screen y grows downward; angles are visual (counter-clockwise)
    const nx = -uy;
    const ny = ux;
    const cx = nib.x + nx * offset;
    const cy = nib.y + ny * offset;
    const h = nib.width / 2;

    return { a: [cx - ux * h, cy - uy * h], b: [cx + ux * h, cy + uy * h] };
  }

  // Same winding for every quad, so a single non-zero fill unions them with no
  // holes where the ribbon crosses itself.
  static orient(quad) {
    let area = 0;
    for (let i = 0; i < quad.length; i += 1) {
      const [x1, y1] = quad[i];
      const [x2, y2] = quad[(i + 1) % quad.length];
      area += x1 * y2 - x2 * y1;
    }
    return area < 0 ? quad.slice().reverse() : quad;
  }

  static colorAt(settings, s) {
    const palette = settings.palette || [];

    if (settings.colorMode !== "gradient" || palette.length < 2) return settings.color || "#000000";

    const cycle = Math.max(1, Number(settings.gradientLength) || 100);
    const buckets = 48; // quantized so the canvas/SVG fill per color, not per quad
    const position = Math.round(((s % cycle) / cycle) * buckets) / buckets;
    const scaled = position * palette.length;
    const index = Math.floor(scaled) % palette.length;
    const next = (index + 1) % palette.length;

    return BroadNibGeometry.mixHex(palette[index], palette[next], scaled - Math.floor(scaled));
  }

  static responsePressure(value, settings) {
    if (settings.pressureEnabled === false) return 0.5;
    const pressure = BroadNibGeometry.clamp01(Number.isFinite(value) ? value : 0.5);
    return Math.pow(pressure, Math.max(0.1, Number(settings.pressureGamma) || 1));
  }

  static catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
  }

  static lerpMaybe(a, b, t, fallback) {
    const fa = Number.isFinite(a);
    const fb = Number.isFinite(b);
    if (fa && fb) return a + (b - a) * t;
    if (fa) return a;
    if (fb) return b;
    return fallback;
  }

  static mixHex(a, b, t) {
    const ca = BroadNibGeometry.hexToRgb(a);
    const cb = BroadNibGeometry.hexToRgb(b);
    const mix = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  static hexToRgb(hex) {
    let h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // mulberry32 — deterministic, so a stroke's fracture looks the same on screen,
  // after undo/redo and in the exported SVG.
  static random(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static radians(deg) {
    return (deg * Math.PI) / 180;
  }

  static clamp01(v) {
    return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  }
}
