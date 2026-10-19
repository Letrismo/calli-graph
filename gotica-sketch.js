(() => {
  const STORAGE_KEY = "equills-gotica-doc-v1";
  const MARGIN = 28; // px around the poster on screen

  let layer; // committed strokes, rendered at screen resolution
  let quill;
  let input;
  let gui;
  let guiControllers = [];
  let view = { k: 1, ox: 0, oy: 0 }; // document (mm) → screen (px)
  let undoStack = [];
  let redoStack = [];
  let saveTimer = null;

  const doc = {
    format: GOTICA_CONFIG.poster.format,
    orientation: GOTICA_CONFIG.poster.orientation,
    background: GOTICA_PALETTES[GOTICA_CONFIG.poster.palette].background,
    strokes: []
  };

  const state = {
    paletteName: GOTICA_CONFIG.poster.palette,
    ...structuredClone(GOTICA_CONFIG.brush),
    colorA: GOTICA_CONFIG.brush.palette[0],
    colorB: GOTICA_CONFIG.brush.palette[1],
    colorC: GOTICA_CONFIG.brush.palette[2],
    colorD: GOTICA_CONFIG.brush.palette[3],
    guides: structuredClone(GOTICA_CONFIG.guides),
    undo: () => undo(),
    redo: () => redo(),
    clear: () => clearAll(),
    exportSvg: () => exportSvg(),
    exportSvgNoBg: () => exportSvg({ includeBackground: false })
  };

  window.setup = () => {
    const viewport = window.EQuillsUI?.viewportSize?.() || { width: windowWidth, height: windowHeight };
    const canvas = createCanvas(viewport.width, viewport.height);
    canvas.parent("app");
    pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

    restoreDocument();
    layer = createGraphics(width, height);
    layer.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

    quill = new Gotica({}, {
      toDocument: (sample) => ({ x: (sample.x - view.ox) / view.k, y: (sample.y - view.oy) / view.k }),
      onCommit: commitStroke
    });
    input = new PointerInput(canvas.elt, quill, layer);
    setupGui();
    window.EQuillsUI?.bindSurfaceActions({ onErase: state.clear });
    bindActions();
    syncBrush();
    layout();
  };

  window.draw = () => {
    background("#1a1a1a");

    // Poster sheet
    noStroke();
    fill(doc.background);
    rect(view.ox, view.oy, posterSize().width * view.k, posterSize().height * view.k);

    drawGuides();
    image(layer, 0, 0);

    const live = quill?.current();
    if (live) drawStroke(drawingContext, live);
  };

  window.windowResized = () => {
    const viewport = window.EQuillsUI?.viewportSize?.() || { width: windowWidth, height: windowHeight };
    resizeCanvas(viewport.width, viewport.height);
    layer = createGraphics(width, height);
    layer.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    input.graphics = layer;
    layout();
  };

  // ─── Document ──────────────────────────────────────────────────────────────

  function posterSize() {
    const base = GOTICA_FORMATS[doc.format] || GOTICA_FORMATS[GOTICA_CONFIG.poster.format];
    return doc.orientation === "horizontal" ? { width: base.height, height: base.width } : { ...base };
  }

  function layout() {
    const size = posterSize();
    const k = Math.min((width - MARGIN * 2) / size.width, (height - MARGIN * 2) / size.height);
    view = { k, ox: (width - size.width * k) / 2, oy: (height - size.height * k) / 2 };
    renderAll();
  }

  function commitStroke(stroke) {
    pushHistory();
    doc.strokes.push(stroke);
    drawStroke(layer.drawingContext, stroke);
    scheduleSave();
  }

  function pushHistory() {
    undoStack.push(doc.strokes.slice());
    if (undoStack.length > 200) undoStack.shift();
    redoStack = [];
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(doc.strokes.slice());
    doc.strokes = undoStack.pop();
    renderAll();
    scheduleSave();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(doc.strokes.slice());
    doc.strokes = redoStack.pop();
    renderAll();
    scheduleSave();
  }

  function clearAll() {
    if (!doc.strokes.length) return;
    pushHistory(); // undoable
    doc.strokes = [];
    renderAll();
    scheduleSave();
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  function renderAll() {
    if (!layer) return;
    layer.clear();
    const ctx = layer.drawingContext;
    // Keep committed strokes inside the sheet, like on paper.
    ctx.save();
    clipToPoster(ctx);
    for (const stroke of doc.strokes) drawStroke(ctx, stroke, false);
    ctx.restore();
  }

  function drawStroke(ctx, stroke, clip = true) {
    const geometry = BroadNibGeometry.build(stroke.points, stroke.settings, stroke.seed);
    ctx.save();
    if (clip) clipToPoster(ctx);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.k, view.k);
    BroadNibRenderer.draw(ctx, geometry, stroke.settings);
    ctx.restore();
  }

  function clipToPoster(ctx) {
    const size = posterSize();
    ctx.beginPath();
    ctx.rect(view.ox, view.oy, size.width * view.k, size.height * view.k);
    ctx.clip();
  }

  // Textura guides, in nib widths of the current brush, drawn only on screen.
  function drawGuides() {
    const g = state.guides;
    if (!g.enabled) return;
    const size = posterSize();
    const nibPx = state.size * view.k;

    drawingContext.save();
    clipToPoster(drawingContext);
    push();
    translate(view.ox, view.oy);
    CalligraphyGuides.render({
      enabled: true,
      nibSize: nibPx,
      unitScale: 1,
      xHeightRatio: g.xHeight,
      ascenderRatio: g.ascender,
      descenderRatio: g.descender,
      offsetY: g.offsetY * view.k,
      color: g.color,
      baselineAlpha: g.baselineAlpha,
      secondaryAlpha: g.secondaryAlpha,
      strokeWeight: 1,
      slantEnabled: g.verticals,
      slantAngle: 0,
      slantSpacingScale: g.verticalSpacing
    }, size.width * view.k, size.height * view.k);
    pop();
    drawingContext.restore();
  }

  // ─── Export / persistence ──────────────────────────────────────────────────

  function exportSvg({ includeBackground = true } = {}) {
    const svg = BroadNibSvg.fromDocument({ size: posterSize(), background: doc.background, strokes: doc.strokes }, { includeBackground });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    a.href = url;
    a.download = `equills-gotica-${stamp}${includeBackground ? "" : "-sin-fondo"}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      } catch {
        // Storage full or unavailable — the work stays in memory; export to keep it.
      }
    }, 400);
  }

  function restoreDocument() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved.strokes)) {
        doc.format = GOTICA_FORMATS[saved.format] ? saved.format : doc.format;
        doc.orientation = saved.orientation === "horizontal" ? "horizontal" : "vertical";
        doc.background = saved.background || doc.background;
        doc.strokes = saved.strokes;
      }
    } catch {
      // Ignore a corrupt or inaccessible save; start fresh.
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  function bindActions() {
    document.querySelector("[data-action='undo']")?.addEventListener("click", undo);
    document.querySelector("[data-action='export']")?.addEventListener("click", () => exportSvg());

    window.addEventListener("keydown", (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "z") return;
      if (event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    });
  }

  function setupGui() {
    gui = new lil.GUI({ title: "Gótica" });
    guiControllers = [];
    const track = (c) => {
      guiControllers.push(c);
      return c;
    };

    const poster = gui.addFolder("Póster");
    const posterState = {
      get format() { return doc.format; },
      set format(v) { doc.format = v; },
      get orientation() { return doc.orientation; },
      set orientation(v) { doc.orientation = v; },
      get background() { return doc.background; },
      set background(v) { doc.background = v; }
    };
    track(poster.add(posterState, "format", Object.keys(GOTICA_FORMATS))).name("Formato").onChange(() => { layout(); scheduleSave(); });
    track(poster.add(posterState, "orientation", ["vertical", "horizontal"])).name("Orientación").onChange(() => { layout(); scheduleSave(); });
    track(poster.addColor(posterState, "background")).name("Fondo").onChange(scheduleSave);
    track(poster.add(state, "paletteName", Object.keys(GOTICA_PALETTES))).name("Paleta").onChange(applyPalette);
    poster.add(state, "exportSvg").name("Exportar SVG");
    poster.add(state, "exportSvgNoBg").name("Exportar SVG sin fondo");
    poster.add(state, "undo").name("Deshacer (⌘Z)");
    poster.add(state, "redo").name("Rehacer (⇧⌘Z)");
    poster.add(state, "clear").name("Limpiar todo");

    const nib = gui.addFolder("Punta");
    track(nib.add(state, "size", 1, 60, 0.5)).name("Ancho (mm)").onChange(syncBrush);
    track(nib.add(state, "nibAngle", -90, 90, 1)).name("Ángulo (°)").onChange(syncBrush);
    track(nib.add(state, "pressureEnabled")).name("Presión").onChange(syncBrush);
    track(nib.add(state, "pressureMinScale", 0.05, 1, 0.01)).name("Presión mín.").onChange(syncBrush);
    track(nib.add(state, "pressureMaxScale", 1, 3, 0.01)).name("Presión máx.").onChange(syncBrush);
    track(nib.add(state, "pressureGamma", 0.25, 3, 0.01)).name("Respuesta").onChange(syncBrush);
    track(nib.add(state, "followPen")).name("Seguir el lápiz").onChange(syncBrush);

    const impossible = gui.addFolder("Imposibles");
    track(impossible.add(state, "driftAmplitude", 0, 90, 1)).name("Deriva (°)").onChange(syncBrush);
    track(impossible.add(state, "driftPeriod", 10, 600, 5)).name("Periodo (mm)").onChange(syncBrush);
    track(impossible.add(state, "pressureTwist", -90, 90, 1)).name("Giro x presión (°)").onChange(syncBrush);
    track(impossible.add(state, "nibCount", 1, 9, 1)).name("Puntas").onChange(syncBrush);
    track(impossible.add(state, "nibGap", 0, 3, 0.05)).name("Separación").onChange(syncBrush);
    track(impossible.add(state, "nibFade", 0, 1, 0.01)).name("Desvanecer puntas").onChange(syncBrush);
    track(impossible.add(state, "fracture")).name("Fractura").onChange(syncBrush);
    track(impossible.add(state, "fractureLength", 2, 120, 1)).name("Largo esquirla (mm)").onChange(syncBrush);
    track(impossible.add(state, "fractureGap", 0, 0.8, 0.01)).name("Hueco").onChange(syncBrush);
    track(impossible.add(state, "fractureShift", 0, 1.5, 0.01)).name("Dispersión").onChange(syncBrush);
    track(impossible.add(state, "fractureRotate", 0, 90, 1)).name("Rotación (°)").onChange(syncBrush);

    const render = gui.addFolder("Trazo");
    track(render.add(state, "fill")).name("Relleno").onChange(syncBrush);
    track(render.add(state, "outline")).name("Contorno").onChange(syncBrush);
    track(render.add(state, "graph")).name("Grafo del ductus").onChange(syncBrush);
    track(render.add(state, "graphDensity", 1, 30, 1)).name("Densidad grafo").onChange(syncBrush);
    track(render.addColor(state, "graphColor")).name("Color grafo").onChange(syncBrush);
    track(render.add(state, "lineWidth", 0.05, 3, 0.05)).name("Línea (mm)").onChange(syncBrush);
    track(render.add(state, "alpha", 0.05, 1, 0.01)).name("Opacidad").onChange(syncBrush);

    const colorFolder = gui.addFolder("Color");
    track(colorFolder.add(state, "colorMode", { Sólido: "solid", Gradiente: "gradient" })).name("Modo").onChange(syncBrush);
    track(colorFolder.addColor(state, "color")).name("Tinta").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorA")).name("Gradiente 1").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorB")).name("Gradiente 2").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorC")).name("Gradiente 3").onChange(syncBrush);
    track(colorFolder.addColor(state, "colorD")).name("Gradiente 4").onChange(syncBrush);
    track(colorFolder.add(state, "gradientLength", 10, 1000, 5)).name("Ciclo (mm)").onChange(syncBrush);
    track(colorFolder.add(state, "blend", ["source-over", "multiply", "screen", "lighter", "overlay", "difference"])).name("Mezcla").onChange(syncBrush);

    const guides = gui.addFolder("Guías");
    track(guides.add(state.guides, "enabled")).name("Mostrar");
    track(guides.add(state.guides, "xHeight", 1, 10, 0.5)).name("Altura x (puntas)");
    track(guides.add(state.guides, "ascender", 0, 6, 0.5)).name("Ascendentes");
    track(guides.add(state.guides, "descender", 0, 6, 0.5)).name("Descendentes");
    track(guides.add(state.guides, "offsetY", 0, 400, 1)).name("Desplazar (mm)");
    track(guides.add(state.guides, "verticals")).name("Verticales");
    track(guides.add(state.guides, "verticalSpacing", 1, 8, 0.25)).name("Espaciado (puntas)");
    track(guides.addColor(state.guides, "color")).name("Color");

    impossible.close();
    render.close();
    colorFolder.close();
    guides.close();
  }

  function applyPalette(name) {
    const palette = GOTICA_PALETTES[name];
    if (!palette) return;
    doc.background = palette.background;
    state.colorMode = palette.colorMode;
    state.color = palette.color;
    state.blend = palette.blend;
    [state.colorA, state.colorB, state.colorC, state.colorD] = palette.colors;
    guiControllers.forEach((c) => c.updateDisplay());
    syncBrush();
    scheduleSave();
  }

  function syncBrush() {
    if (!quill) return;
    const { paletteName, colorA, colorB, colorC, colorD, guides, undo: _u, redo: _r, clear: _c, exportSvg: _e, exportSvgNoBg: _n, ...brush } = state;
    quill.setSettings({ ...brush, palette: [colorA, colorB, colorC, colorD] });
  }
})();
