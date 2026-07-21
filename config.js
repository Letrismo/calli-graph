const PILOT_PALETTES = {
  "Aurora": {
    background: "#080a12",
    compositeOperation: "lighter",
    colors: ["#2de2e6", "#6a4c93", "#ff4d6d", "#f9c74f"]
  },
  "Mineral": {
    background: "#f1eadf",
    compositeOperation: "multiply",
    colors: ["#122c34", "#2a9d8f", "#f4a261", "#e76f51"]
  },
  "Nocturno": {
    background: "#0d0d0d",
    compositeOperation: "screen",
    colors: ["#4cc9f0", "#b8f2e6", "#f72585", "#ffd166"]
  },
  "Psicotropico": {
    background: "#05020a",
    compositeOperation: "lighter",
    colors: ["#00f5d4", "#f15bb5", "#fee440", "#9b5de5"]
  },
  "Acido": {
    background: "#120016",
    compositeOperation: "screen",
    colors: ["#39ff14", "#ff206e", "#fbff12", "#00bbf9"]
  }
};

const PILOT_CONFIG = {
  canvas: {
    background: PILOT_PALETTES.Aurora.background,
    guides: {
      enabled: true,
      unitScale: 2.4,
      xHeightRatio: 1,
      ascenderRatio: 0.72,
      descenderRatio: 0.48,
      offsetY: 48,
      color: "#8fd3ff",
      baselineAlpha: 0.34,
      secondaryAlpha: 0.18,
      strokeWeight: 1,
      slantEnabled: true,
      slantAngle: 12,
      slantSpacingScale: 2
    }
  },
  brush: {
    name: "Pilot",
    size: 89,
    pressureEnabled: true,
    pressureMinScale: 0.35,
    pressureMaxScale: 1.65,
    pressureGamma: 1,
    pressureOverrideEnabled: false,
    pressureOverride: 0.5,
    spacing: 0.04,
    curveStep: 0.12,
    curveSmoothing: 1,
    smoothingAmount: 0.24,
    simplificationAlgorithm: "visvalingam-whyatt",
    simplificationTolerance: 2.5,
    colorMode: "gradient",
    color: "#f2f2f0",
    palette: [...PILOT_PALETTES.Aurora.colors],
    compositeOperation: PILOT_PALETTES.Aurora.compositeOperation,
    alpha: 0.06
  }
};

const PANTOGRAPH_CONFIG = {
  brush: {
    name: "Pantograph",
    size: 48,
    pressureEnabled: true,
    pressureMinScale: 0.35,
    pressureMaxScale: 1.65,
    pressureGamma: 1,
    pressureOverrideEnabled: false,
    pressureOverride: 0.5,
    spacing: 0.04,
    curveStep: 0.12,
    curveSmoothing: 1,
    smoothingAmount: 0.24,
    simplificationAlgorithm: "visvalingam-whyatt",
    simplificationTolerance: 2.5,
    colorMode: "gradient",
    color: "#f2f2f0",
    palette: [...PILOT_PALETTES.Aurora.colors],
    compositeOperation: PILOT_PALETTES.Aurora.compositeOperation,
    alpha: 0.06,
    // Ratio of transformed displacement to raw pointer displacement, applied
    // incrementally per sample (not anchored to a fixed pivot) — negative
    // values invert that axis.
    scaleX: 1,
    scaleY: 1,
    scalePressure: 1,
    // The original (raw pointer) line, drawn alongside the transformed mark.
    originalEnabled: true,
    originalSize: 24,
    originalColor: "#ffffff",
    originalAlpha: 0.35
  }
};
