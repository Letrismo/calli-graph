(() => {
  const BRUSH_TYPES = { Pilot: "pilot", "Pantógrafo": "pantograph", "Resorte": "tether", "Cerdas": "bristle" };

  let layer;
  let brush;
  let input;
  let gui;
  let guiControllers = [];
  let pressureReadout;
  let lastPressureGuiUpdate = 0;

  const state = {
    brushType: "pilot",
    paletteName: "Aurora",
    background: PILOT_CONFIG.canvas.background,
    guidesEnabled: PILOT_CONFIG.canvas.guides.enabled,
    guideUnitScale: PILOT_CONFIG.canvas.guides.unitScale,
    guideXHeightRatio: PILOT_CONFIG.canvas.guides.xHeightRatio,
    guideAscenderRatio: PILOT_CONFIG.canvas.guides.ascenderRatio,
    guideDescenderRatio: PILOT_CONFIG.canvas.guides.descenderRatio,
    guideOffsetY: PILOT_CONFIG.canvas.guides.offsetY,
    guideColor: PILOT_CONFIG.canvas.guides.color,
    guideBaselineAlpha: PILOT_CONFIG.canvas.guides.baselineAlpha,
    guideSecondaryAlpha: PILOT_CONFIG.canvas.guides.secondaryAlpha,
    guideStrokeWeight: PILOT_CONFIG.canvas.guides.strokeWeight,
    guideSlantEnabled: PILOT_CONFIG.canvas.guides.slantEnabled,
    guideSlantAngle: PILOT_CONFIG.canvas.guides.slantAngle,
    guideSlantSpacingScale: PILOT_CONFIG.canvas.guides.slantSpacingScale,
    size: PILOT_CONFIG.brush.size,
    pressureEnabled: PILOT_CONFIG.brush.pressureEnabled,
    pressureMinScale: PILOT_CONFIG.brush.pressureMinScale,
    pressureMaxScale: PILOT_CONFIG.brush.pressureMaxScale,
    pressureGamma: PILOT_CONFIG.brush.pressureGamma,
    pressureOverrideEnabled: PILOT_CONFIG.brush.pressureOverrideEnabled,
    pressureOverride: PILOT_CONFIG.brush.pressureOverride,
    pressurePointer: "-",
    pressureSource: "-",
    pressureRaw: "-",
    pressureApplied: "-",
    pressureTilt: "-",
    spacing: PILOT_CONFIG.brush.spacing,
    vertexDensity: Math.round(1 / PILOT_CONFIG.brush.curveStep),
    curveSmoothing: PILOT_CONFIG.brush.curveSmoothing,
    smoothingAmount: PILOT_CONFIG.brush.smoothingAmount,
    simplificationAlgorithm: PILOT_CONFIG.brush.simplificationAlgorithm,
    simplificationTolerance: PILOT_CONFIG.brush.simplificationTolerance,
    colorMode: PILOT_CONFIG.brush.colorMode,
    color: PILOT_CONFIG.brush.color,
    colorA: PILOT_CONFIG.brush.palette[0],
    colorB: PILOT_CONFIG.brush.palette[1],
    colorC: PILOT_CONFIG.brush.palette[2],
    colorD: PILOT_CONFIG.brush.palette[3],
    compositeOperation: PILOT_CONFIG.brush.compositeOperation,
    alpha: PILOT_CONFIG.brush.alpha,
    scaleX: PANTOGRAPH_CONFIG.brush.scaleX,
    scaleY: PANTOGRAPH_CONFIG.brush.scaleY,
    scalePressure: PANTOGRAPH_CONFIG.brush.scalePressure,
    originalEnabled: PANTOGRAPH_CONFIG.brush.originalEnabled,
    originalSize: PANTOGRAPH_CONFIG.brush.originalSize,
    originalColor: PANTOGRAPH_CONFIG.brush.originalColor,
    originalAlpha: PANTOGRAPH_CONFIG.brush.originalAlpha,
    offsetScaleX: TETHER_CONFIG.brush.offsetScaleX,
    offsetScaleY: TETHER_CONFIG.brush.offsetScaleY,
    offsetScalePressure: TETHER_CONFIG.brush.offsetScalePressure,
    offsetSize: TETHER_CONFIG.brush.offsetSize,
    offsetColor: TETHER_CONFIG.brush.offsetColor,
    offsetAlpha: TETHER_CONFIG.brush.offsetAlpha,
    bristleOffsetScaleX: BRISTLE_CONFIG.brush.bristleOffsetScaleX,
    bristleOffsetScaleY: BRISTLE_CONFIG.brush.bristleOffsetScaleY,
    bristleOffsetScalePressure: BRISTLE_CONFIG.brush.bristleOffsetScalePressure,
    bristleOffsetSize: BRISTLE_CONFIG.brush.bristleOffsetSize,
    bristleOffsetColor: BRISTLE_CONFIG.brush.bristleOffsetColor,
    bristleOffsetAlpha: BRISTLE_CONFIG.brush.bristleOffsetAlpha,
    maxLines: BRISTLE_CONFIG.brush.maxLines,
    spread: BRISTLE_CONFIG.brush.spread,
    clear: () => layer?.clear()
  };

  window.setup = () => {
    const viewport = window.EQuillsUI?.viewportSize?.() || { width: windowWidth, height: windowHeight };
    const canvas = createCanvas(viewport.width, viewport.height);
    canvas.parent("app");
    pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

    layer = createGraphics(width, height);
    layer.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    layer.clear();

    brush = new Pilot();
    pressureReadout = document.getElementById("pressure-readout");
    input = new PointerInput(canvas.elt, brush, layer, { onSample: updatePressureDebug });
    setupGui();
    window.EQuillsUI?.bindSurfaceActions({ onErase: state.clear });
    syncBrush();
  };

  window.draw = () => {
    background(state.background);
    CalligraphyGuides.render(guideSettings(state.size), width, height);
    image(layer, 0, 0);
  };

  window.windowResized = () => {
    const oldLayer = layer;
    const viewport = window.EQuillsUI?.viewportSize?.() || { width: windowWidth, height: windowHeight };
    resizeCanvas(viewport.width, viewport.height);

    layer = createGraphics(width, height);
    layer.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    layer.clear();
    layer.image(oldLayer, 0, 0);
    input.graphics = layer;
  };

  function setupGui() {
    gui = new lil.GUI({ title: "eQuills" });
    guiControllers = [];
    const track = (controller) => {
      guiControllers.push(controller);
      return controller;
    };

    track(gui.add(state, "brushType", BRUSH_TYPES)).name("Brush").onChange(switchBrush);

    const brushFolder = gui.addFolder("Brush");
    track(brushFolder.add(state, "size", 8, 96, 1)).name("Size").onChange(syncBrush);
    track(brushFolder.add(state, "spacing", 0.04, 0.28, 0.01)).name("Spacing").onChange(syncBrush);
    track(brushFolder.add(state, "alpha", 0.05, 1, 0.01)).name("Alpha").onChange(syncBrush);

    const pantograph = gui.addFolder("Pantógrafo");
    track(pantograph.add(state, "scaleX", -8, 8, 0.1)).name("Escala X").onChange(syncBrush);
    track(pantograph.add(state, "scaleY", -8, 8, 0.1)).name("Escala Y").onChange(syncBrush);
    track(pantograph.add(state, "scalePressure", -4, 4, 0.1)).name("Escala presión").onChange(syncBrush);

    const original = gui.addFolder("Línea original");
    track(original.add(state, "originalEnabled")).name("Mostrar").onChange(syncBrush);
    track(original.add(state, "originalSize", 1, 96, 1)).name("Tamaño").onChange(syncBrush);
    track(original.add(state, "originalAlpha", 0.02, 1, 0.01)).name("Opacidad").onChange(syncBrush);
    track(original.addColor(state, "originalColor")).name("Color").onChange(syncBrush);

    const tether = gui.addFolder("Resorte");
    track(tether.add(state, "offsetScaleX", -4, 4, 0.1)).name("Desfase X").onChange(syncBrush);
    track(tether.add(state, "offsetScaleY", -4, 4, 0.1)).name("Desfase Y").onChange(syncBrush);
    track(tether.add(state, "offsetScalePressure", -4, 4, 0.1)).name("Desfase presión").onChange(syncBrush);
    track(tether.add(state, "offsetSize", 1, 96, 1)).name("Tamaño").onChange(syncBrush);
    track(tether.add(state, "offsetAlpha", 0.02, 1, 0.01)).name("Opacidad").onChange(syncBrush);
    track(tether.addColor(state, "offsetColor")).name("Color").onChange(syncBrush);

    const bristle = gui.addFolder("Cerdas");
    track(bristle.add(state, "bristleOffsetScaleX", -4, 4, 0.1)).name("Desfase X").onChange(syncBrush);
    track(bristle.add(state, "bristleOffsetScaleY", -4, 4, 0.1)).name("Desfase Y").onChange(syncBrush);
    track(bristle.add(state, "bristleOffsetScalePressure", -4, 4, 0.1)).name("Desfase presión").onChange(syncBrush);
    track(bristle.add(state, "bristleOffsetSize", 1, 96, 1)).name("Tamaño").onChange(syncBrush);
    track(bristle.add(state, "bristleOffsetAlpha", 0.02, 1, 0.01)).name("Opacidad").onChange(syncBrush);
    track(bristle.addColor(state, "bristleOffsetColor")).name("Color").onChange(syncBrush);
    track(bristle.add(state, "maxLines", 1, 8, 1)).name("Máx. líneas").onChange(syncBrush);
    track(bristle.add(state, "spread", 0, 1, 0.01)).name("Separación").onChange(syncBrush);

    const pressure = gui.addFolder("Pressure");
    track(pressure.add(state, "pressureEnabled")).name("Enabled").onChange(syncBrush);
    track(pressure.add(state, "pressureMinScale", 0.05, 1, 0.01)).name("Min scale").onChange(syncBrush);
    track(pressure.add(state, "pressureMaxScale", 1, 4, 0.01)).name("Max scale").onChange(syncBrush);
    track(pressure.add(state, "pressureGamma", 0.25, 3, 0.01)).name("Response").onChange(syncBrush);
    track(pressure.add(state, "pressureOverrideEnabled")).name("Test mode").onChange(syncBrush);
    track(pressure.add(state, "pressureOverride", 0, 1, 0.01)).name("Test pressure").onChange(syncBrush);
    track(pressure.add(state, "pressurePointer")).name("Pointer").listen();
    track(pressure.add(state, "pressureSource")).name("Source").listen();
    track(pressure.add(state, "pressureRaw")).name("Raw").listen();
    track(pressure.add(state, "pressureApplied")).name("Applied").listen();
    track(pressure.add(state, "pressureTilt")).name("Tilt").listen();

    const guides = gui.addFolder("Guides");
    track(guides.add(state, "guidesEnabled")).name("Enabled");
    track(guides.add(state, "guideUnitScale", 0.75, 6, 0.05)).name("Size ratio");
    track(guides.add(state, "guideXHeightRatio", 0.5, 2.5, 0.05)).name("X-height");
    track(guides.add(state, "guideAscenderRatio", 0, 2, 0.05)).name("Ascender");
    track(guides.add(state, "guideDescenderRatio", 0, 2, 0.05)).name("Descender");
    track(guides.add(state, "guideOffsetY", 0, 240, 1)).name("Offset Y");
    track(guides.addColor(state, "guideColor")).name("Color");
    track(guides.add(state, "guideBaselineAlpha", 0, 1, 0.01)).name("Baseline alpha");
    track(guides.add(state, "guideSecondaryAlpha", 0, 1, 0.01)).name("Line alpha");
    track(guides.add(state, "guideStrokeWeight", 0.25, 4, 0.25)).name("Weight");
    track(guides.add(state, "guideSlantEnabled")).name("Slant");
    track(guides.add(state, "guideSlantAngle", -35, 35, 1)).name("Slant angle");
    track(guides.add(state, "guideSlantSpacingScale", 0.75, 5, 0.05)).name("Slant spacing");

    const curve = gui.addFolder("Curve");
    track(curve.add(state, "vertexDensity", 3, 72, 1)).name("Vertices").onChange(syncBrush);
    track(curve.add(state, "curveSmoothing", 0, 4, 1)).name("Smooth passes").onChange(syncBrush);
    track(curve.add(state, "smoothingAmount", 0, 0.48, 0.01)).name("Smooth amount").onChange(syncBrush);
    track(curve.add(state, "simplificationAlgorithm", {
      None: "none",
      "Douglas-Peucker": "douglas-peucker",
      "Visvalingam-Whyatt": "visvalingam-whyatt"
    })).name("Reduction").onChange(syncBrush);
    track(curve.add(state, "simplificationTolerance", 0, 24, 0.25)).name("Tolerance").onChange(syncBrush);

    const colorFolder = gui.addFolder("Color");
    track(colorFolder.add(state, "paletteName", Object.keys(PILOT_PALETTES))).name("Palette").onChange(applyPalette);
    track(colorFolder.add(state, "colorMode", ["solid", "gradient"])).name("Mode").onChange(syncBrush);
    track(colorFolder.addColor(state, "color")).name("Solid").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorA")).name("Stop 1").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorB")).name("Stop 2").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorC")).name("Stop 3").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorD")).name("Stop 4").onChange(syncBrush);
    track(colorFolder.add(state, "compositeOperation", [
      "source-over",
      "lighter",
      "multiply",
      "screen",
      "overlay",
      "difference"
    ])).name("Composite").onChange(syncBrush);

    const canvasFolder = gui.addFolder("Canvas");
    track(canvasFolder.addColor(state, "background")).name("Background");
    track(canvasFolder.add(state, "clear")).name("Clear");
  }

  function applyPalette(name) {
    const palette = PILOT_PALETTES[name];

    if (!palette) return;

    state.background = palette.background;
    state.compositeOperation = palette.compositeOperation;
    [state.colorA, state.colorB, state.colorC, state.colorD] = palette.colors;
    state.colorMode = "gradient";
    refreshGui();
    syncBrush();
  }

  const BRUSH_CTORS = { pilot: Pilot, pantograph: Pantograph, tether: Tether, bristle: Bristle };

  function switchBrush(nextType) {
    const Ctor = BRUSH_CTORS[nextType] || Pilot;
    brush = new Ctor();
    input.quill = brush;
    syncBrush();
  }

  function syncBrush() {
    if (!brush) return;

    // The brush receives only rendering settings; canvas state stays in this sketch.
    brush.setSettings({
      size: state.size,
      pressureEnabled: state.pressureEnabled,
      pressureMinScale: state.pressureMinScale,
      pressureMaxScale: state.pressureMaxScale,
      pressureGamma: state.pressureGamma,
      pressureOverrideEnabled: state.pressureOverrideEnabled,
      pressureOverride: state.pressureOverride,
      spacing: state.spacing,
      curveStep: 1 / state.vertexDensity,
      curveSmoothing: state.curveSmoothing,
      smoothingAmount: state.smoothingAmount,
      simplificationAlgorithm: state.simplificationAlgorithm,
      simplificationTolerance: state.simplificationTolerance,
      colorMode: state.colorMode,
      color: state.color,
      palette: [state.colorA, state.colorB, state.colorC, state.colorD],
      compositeOperation: state.compositeOperation,
      alpha: state.alpha,
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      scalePressure: state.scalePressure,
      originalEnabled: state.originalEnabled,
      originalSize: state.originalSize,
      originalColor: state.originalColor,
      originalAlpha: state.originalAlpha,
      offsetScaleX: state.offsetScaleX,
      offsetScaleY: state.offsetScaleY,
      offsetScalePressure: state.offsetScalePressure,
      offsetSize: state.offsetSize,
      offsetColor: state.offsetColor,
      offsetAlpha: state.offsetAlpha,
      maxLines: state.maxLines,
      spread: state.spread,
      bristleOffsetScaleX: state.bristleOffsetScaleX,
      bristleOffsetScaleY: state.bristleOffsetScaleY,
      bristleOffsetScalePressure: state.bristleOffsetScalePressure,
      bristleOffsetSize: state.bristleOffsetSize,
      bristleOffsetColor: state.bristleOffsetColor,
      bristleOffsetAlpha: state.bristleOffsetAlpha
    });
  }

  function refreshGui() {
    guiControllers.forEach((controller) => controller.updateDisplay());
  }

  function guideSettings(nibSize) {
    return {
      enabled: state.guidesEnabled,
      nibSize,
      unitScale: state.guideUnitScale,
      xHeightRatio: state.guideXHeightRatio,
      ascenderRatio: state.guideAscenderRatio,
      descenderRatio: state.guideDescenderRatio,
      offsetY: state.guideOffsetY,
      color: state.guideColor,
      baselineAlpha: state.guideBaselineAlpha,
      secondaryAlpha: state.guideSecondaryAlpha,
      strokeWeight: state.guideStrokeWeight,
      slantEnabled: state.guideSlantEnabled,
      slantAngle: state.guideSlantAngle,
      slantSpacingScale: state.guideSlantSpacingScale
    };
  }

  function updatePressureDebug(sample, pressure) {
    state.pressurePointer = sample.pointerType || pressure.pointerType || "-";
    state.pressureSource = pressure.source || "-";
    state.pressureRaw = formatPressure(pressure.nativePressure ?? pressure.pressureJsForce ?? sample.pressure);
    state.pressureApplied = formatPressure(resolveAppliedPressure(sample.pressure));
    state.pressureTilt = formatTilt(sample);
    updatePressureReadout();

    const now = performance.now();
    if (now - lastPressureGuiUpdate < 80) return;

    lastPressureGuiUpdate = now;
    refreshGui();
  }

  function resolveAppliedPressure(rawPressure) {
    if (!state.pressureEnabled) return 0.5;
    if (state.pressureOverrideEnabled) return clampPressure(state.pressureOverride);

    return clampPressure(Math.pow(clampPressure(rawPressure), Math.max(0.1, Number(state.pressureGamma) || 1)));
  }

  function clampPressure(value) {
    const pressure = Number(value);

    if (!Number.isFinite(pressure)) return 0.5;

    return Math.min(1, Math.max(0, pressure));
  }

  function formatPressure(value) {
    return Number.isFinite(value) ? value.toFixed(3) : "-";
  }

  function formatTilt(sample) {
    const tiltX = Number.isFinite(sample.tiltX) ? sample.tiltX : 0;
    const tiltY = Number.isFinite(sample.tiltY) ? sample.tiltY : 0;

    return `${tiltX.toFixed(0)}, ${tiltY.toFixed(0)}`;
  }

  function updatePressureReadout() {
    if (!pressureReadout) return;

    pressureReadout.textContent = `Pressure ${state.pressureApplied} | raw ${state.pressureRaw} | ${state.pressurePointer}/${state.pressureSource}`;
  }
})();
