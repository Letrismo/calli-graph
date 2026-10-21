import { readFileSync, readdirSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const projectRoot = import.meta.dirname;

function staticDemoFiles() {
  const files = [
    ["js/config.js", "config.js"],
    ["sketch.js", "sketch.js"],
    ["gotica-sketch.js", "gotica-sketch.js"],
    ["js/ui-actions.js", "ui-actions.js"],
    ["manifest.webmanifest", "manifest.webmanifest"],
    ["img/icon.svg", "icon.svg"],
    ["img/calli-graph-equills-pcd-25.png", "img/calli-graph-equills-pcd-25.png"],
  ];

  for (const directory of ["js/brushes", "js/core", "js/renderers"]) {
    for (const entry of readdirSync(resolve(projectRoot, directory), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile() && extname(entry.name) === ".js") {
        const sourceFile = relative(projectRoot, resolve(entry.parentPath, entry.name));
        const outputFile = relative(resolve(projectRoot, "js"), resolve(entry.parentPath, entry.name));
        files.push([sourceFile, outputFile]);
      }
    }
  }

  // Same mapping for `npm run dev`: the demo pages request ./config.js, ./core/*.js…
  // (their build-output paths), which don't exist at the project root — without this
  // the dev server answers with the index.html fallback and the demo never loads.
  const devRoutes = new Map(files.map(([sourceFile, outputFile]) => ["/" + outputFile.split(sep).join("/"), sourceFile]));

  return {
    name: "static-demo-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const sourceFile = devRoutes.get((req.url ?? "").split("?")[0]);
        if (!sourceFile) return next();
        const type = sourceFile.endsWith(".js") ? "text/javascript"
          : sourceFile.endsWith(".svg") ? "image/svg+xml"
          : sourceFile.endsWith(".png") ? "image/png"
          : sourceFile.endsWith(".webmanifest") ? "application/manifest+json"
          : "application/octet-stream";
        res.setHeader("Content-Type", type);
        res.end(readFileSync(resolve(projectRoot, sourceFile)));
      });
    },
    buildStart() {
      for (const [sourceFile, outputFile] of files) {
        this.emitFile({
          type: "asset",
          fileName: outputFile.split(sep).join("/"),
          source: readFileSync(resolve(projectRoot, sourceFile)),
        });
      }
    },
  };
}

export default defineConfig({
  // Las rutas relativas permiten publicar el build bajo /<repositorio>/.
  base: "./",
  plugins: [tailwindcss(), staticDemoFiles()],
  server: {
    // Development requests use Vite's origin; production calls the public API directly.
    proxy: {
      "/api/events": {
        target: "https://centro.juanfuent.es",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(projectRoot, "index.html"),
        demo: resolve(projectRoot, "demo.html"),
        gotica: resolve(projectRoot, "gotica.html"),
      },
    },
  },
});
