const GOTICA_PALETTES = {
  "Pergamino": {
    background: "#efe6d2",
    colorMode: "solid",
    color: "#1b1611",
    colors: ["#1b1611", "#3a2a1c", "#1b1611", "#5a3e26"],
    blend: "source-over"
  },
  "Rúbrica": {
    background: "#f3ecdc",
    colorMode: "gradient",
    color: "#1b1611",
    colors: ["#1b1611", "#a4161a", "#1b1611", "#a4161a"],
    blend: "multiply"
  },
  "Iluminado": {
    background: "#120d0a",
    colorMode: "gradient",
    color: "#d4a017",
    colors: ["#8c6a1c", "#d4a017", "#fff1b8", "#d4a017"],
    blend: "screen"
  },
  "Vitral": {
    background: "#0b0f1a",
    colorMode: "gradient",
    color: "#e0a526",
    colors: ["#1f4e9c", "#b3261e", "#e0a526", "#2e7d4f"],
    blend: "screen"
  },
  "Neón gótico": {
    background: "#07020d",
    colorMode: "gradient",
    color: "#ff2bd6",
    colors: ["#ff2bd6", "#7a5cff", "#00e5ff", "#fffb00"],
    blend: "lighter"
  }
};

// Poster sizes in millimetres (portrait).
const GOTICA_FORMATS = {
  "A3 · 297×420 mm": { width: 297, height: 420 },
  "A2 · 420×594 mm": { width: 420, height: 594 },
  "A1 · 594×841 mm": { width: 594, height: 841 },
  "18×24 in": { width: 457.2, height: 609.6 },
  "24×36 in": { width: 609.6, height: 914.4 }
};

const GOTICA_CONFIG = {
  poster: {
    format: "A2 · 420×594 mm",
    orientation: "vertical",
    palette: "Pergamino"
  },
  // Textura proportions, measured in nib widths: x-height 5, ascender/descender 2.
  guides: {
    enabled: true,
    xHeight: 5,
    ascender: 2,
    descender: 2,
    offsetY: 60,
    verticals: true,
    verticalSpacing: 2.5,
    color: "#8a7a62",
    baselineAlpha: 0.45,
    secondaryAlpha: 0.22
  },
  brush: {
    name: "Gótica",
    size: 14, // nib width in mm
    nibAngle: 40,
    pressureEnabled: true,
    pressureMinScale: 0.75,
    pressureMaxScale: 1.15,
    pressureGamma: 1,
    followPen: false,
    resolution: 0.06,
    // Impossible-pen controls
    driftAmplitude: 0,
    driftPeriod: 120,
    pressureTwist: 0,
    nibCount: 1,
    nibGap: 0.45,
    nibFade: 0,
    fracture: false,
    fractureLength: 30,
    fractureGap: 0.12,
    fractureShift: 0.15,
    fractureRotate: 12,
    // Rendering
    fill: true,
    outline: false,
    graph: false,
    graphDensity: 6,
    graphAlpha: 0.8,
    graphColor: "#a4161a",
    lineWidth: 0.35,
    alpha: 1,
    colorMode: GOTICA_PALETTES.Pergamino.colorMode,
    color: GOTICA_PALETTES.Pergamino.color,
    palette: [...GOTICA_PALETTES.Pergamino.colors],
    gradientLength: 180,
    blend: GOTICA_PALETTES.Pergamino.blend
  }
};

// The Gótica eQuill records the gesture as document-space samples (mm) and hands
// the finished stroke to `onCommit`; rendering is BroadNibGeometry's job, so the
// same stroke can be redrawn at any scale — on screen or in the exported SVG.
class Gotica extends EQuill {
  constructor(settings = {}, { toDocument, onCommit } = {}) {
    super({ ...GOTICA_CONFIG.brush, ...settings });
    this.toDocument = toDocument || ((sample) => ({ x: sample.x, y: sample.y }));
    this.onCommit = onCommit || null;
    this.points = null;
    this.seed = 1;
  }

  begin(sample) {
    super.begin(sample);
    this.seed = Math.floor(Math.random() * 2 ** 31);
    this.points = [this.capture(sample)];
  }

  update(sample) {
    if (!this.points) return;
    this.stroke.add(sample);
    this.points.push(this.capture(sample));
  }

  end(sample) {
    if (!this.points) return;
    this.points.push(this.capture(sample));
    const committed = { points: this.points, settings: structuredClone(this.settings), seed: this.seed };
    this.points = null;
    this.stroke = null;
    this.onCommit?.(committed);
  }

  // The in-progress stroke, for live preview.
  current() {
    return this.points ? { points: this.points, settings: this.settings, seed: this.seed } : null;
  }

  capture(sample) {
    const p = this.toDocument(sample);
    return {
      x: p.x,
      y: p.y,
      pressure: sample.pressure,
      azimuth: Number.isFinite(sample.azimuthAngle) ? sample.azimuthAngle : null
    };
  }

  renderIncrement() {
    // Gótica renders from the whole stroke (see gotica-sketch.js), not incrementally.
  }
}
