// Serializes a Gótica document (strokes in millimetres) to an SVG at real print
// size: width/height in mm, viewBox in mm, one <g> per stroke.
class BroadNibSvg {
  static fromDocument(doc, { includeBackground = true } = {}) {
    const { width, height } = doc.size;
    const parts = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${BroadNibSvg.n(width)}mm" height="${BroadNibSvg.n(height)}mm" viewBox="0 0 ${BroadNibSvg.n(width)} ${BroadNibSvg.n(height)}">`,
      `<!-- eQuills · Gótica · ${doc.strokes.length} trazos -->`
    ];

    if (includeBackground) {
      parts.push(`<rect id="fondo" width="${BroadNibSvg.n(width)}" height="${BroadNibSvg.n(height)}" fill="${doc.background}"/>`);
    }

    doc.strokes.forEach((stroke, index) => {
      const settings = stroke.settings;
      const geometry = BroadNibGeometry.build(stroke.points, settings, stroke.seed);
      const blend = settings.blend && settings.blend !== "source-over" ? ` style="mix-blend-mode:${BroadNibSvg.cssBlend(settings.blend)}"` : "";
      parts.push(`<g id="trazo-${index + 1}"${blend}>`);

      for (const fill of geometry.fills) {
        const d = fill.quads.map((q) => `M${q.map(([x, y]) => `${BroadNibSvg.n(x)} ${BroadNibSvg.n(y)}`).join("L")}Z`).join("");
        parts.push(`<path d="${d}" fill="${fill.color}"${BroadNibSvg.opacity("fill-opacity", fill.alpha)} fill-rule="nonzero"/>`);
      }

      const lineWidth = Math.max(0.01, Number(settings.lineWidth) || 0.35);

      for (const outline of geometry.outlines) {
        const pts = outline.points.map(([x, y]) => `${BroadNibSvg.n(x)},${BroadNibSvg.n(y)}`).join(" ");
        parts.push(`<polygon points="${pts}" fill="none" stroke="${outline.color}" stroke-width="${BroadNibSvg.n(lineWidth)}" stroke-linejoin="round"${BroadNibSvg.opacity("stroke-opacity", outline.alpha)}/>`);
      }

      if (geometry.spine.length || geometry.rungs.length) {
        const graphColor = settings.graphColor || settings.color || "#000000";
        const alpha = BroadNibGeometry.clamp01(Number(settings.graphAlpha ?? 0.8));
        parts.push(`<g class="grafo" stroke="${graphColor}" fill="${graphColor}"${BroadNibSvg.opacity("opacity", alpha)}>`);

        if (geometry.spine.length > 1) {
          const pts = geometry.spine.map(([x, y]) => `${BroadNibSvg.n(x)},${BroadNibSvg.n(y)}`).join(" ");
          parts.push(`<polyline points="${pts}" fill="none" stroke-width="${BroadNibSvg.n(lineWidth * 0.6)}"/>`);
        }
        if (geometry.rungs.length) {
          const d = geometry.rungs.map(([x1, y1, x2, y2]) => `M${BroadNibSvg.n(x1)} ${BroadNibSvg.n(y1)}L${BroadNibSvg.n(x2)} ${BroadNibSvg.n(y2)}`).join("");
          parts.push(`<path d="${d}" fill="none" stroke-width="${BroadNibSvg.n(lineWidth * 0.6)}"/>`);
        }
        for (const [x, y] of geometry.nodes) {
          parts.push(`<circle cx="${BroadNibSvg.n(x)}" cy="${BroadNibSvg.n(y)}" r="${BroadNibSvg.n(lineWidth * 1.6)}" stroke="none"/>`);
        }
        parts.push(`</g>`);
      }

      parts.push(`</g>`);
    });

    parts.push(`</svg>`);
    return parts.join("\n");
  }

  // Canvas composite names → CSS mix-blend-mode names
  static cssBlend(op) {
    return { lighter: "plus-lighter", "source-over": "normal" }[op] || op;
  }

  static opacity(attr, alpha) {
    return alpha < 1 ? ` ${attr}="${BroadNibSvg.n(alpha, 3)}"` : "";
  }

  static n(value, digits = 2) {
    return Number(value.toFixed(digits)).toString();
  }
}
