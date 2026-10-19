// Draws BroadNibGeometry onto a 2D canvas context, in document units — the
// caller sets up the document → screen transform on `ctx` beforehand.
class BroadNibRenderer {
  static draw(ctx, geometry, settings) {
    ctx.save();
    ctx.globalCompositeOperation = settings.blend || "source-over";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // One Path2D per color: filling all quads at once unions them seamlessly
    // (filling them one by one leaves antialiasing hairlines between quads).
    for (const fill of geometry.fills) {
      const path = new Path2D();
      for (const quad of fill.quads) {
        path.moveTo(quad[0][0], quad[0][1]);
        for (let i = 1; i < quad.length; i += 1) path.lineTo(quad[i][0], quad[i][1]);
        path.closePath();
      }
      ctx.globalAlpha = fill.alpha;
      ctx.fillStyle = fill.color;
      ctx.fill(path, "nonzero");
    }

    const lineWidth = Math.max(0.01, Number(settings.lineWidth) || 0.35);

    for (const outline of geometry.outlines) {
      if (outline.points.length < 2) continue;
      ctx.globalAlpha = outline.alpha;
      ctx.strokeStyle = outline.color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(outline.points[0][0], outline.points[0][1]);
      for (let i = 1; i < outline.points.length; i += 1) ctx.lineTo(outline.points[i][0], outline.points[i][1]);
      ctx.closePath();
      ctx.stroke();
    }

    if (geometry.spine.length || geometry.rungs.length) {
      const graphColor = settings.graphColor || settings.color || "#000000";
      ctx.globalAlpha = BroadNibGeometry.clamp01(Number(settings.graphAlpha ?? 0.8));
      ctx.strokeStyle = graphColor;
      ctx.fillStyle = graphColor;
      ctx.lineWidth = lineWidth * 0.6;

      if (geometry.spine.length > 1) {
        ctx.beginPath();
        ctx.moveTo(geometry.spine[0][0], geometry.spine[0][1]);
        for (let i = 1; i < geometry.spine.length; i += 1) ctx.lineTo(geometry.spine[i][0], geometry.spine[i][1]);
        ctx.stroke();
      }

      ctx.beginPath();
      for (const [x1, y1, x2, y2] of geometry.rungs) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      const r = lineWidth * 1.6;
      for (const [x, y] of geometry.nodes) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
