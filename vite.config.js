import { readFileSync, readdirSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const projectRoot = import.meta.dirname;

function staticDemoFiles() {
  const files = [
    ["js/config.js", "config.js"],
    ["sketch.js", "sketch.js"],
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

  return {
    name: "static-demo-files",
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
  build: {
    rollupOptions: {
      input: {
        home: resolve(projectRoot, "index.html"),
        demo: resolve(projectRoot, "demo.html"),
      },
    },
  },
});
