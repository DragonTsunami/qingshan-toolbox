// Tiny static file server for the built UI (used for visual verification).
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "desktop/ui/dist");
const port = Number(process.argv[3] || 1421);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      file = path.join(root, "index.html");
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "content-type": mime[ext] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`serving ${root} at http://127.0.0.1:${port}`);
  });
