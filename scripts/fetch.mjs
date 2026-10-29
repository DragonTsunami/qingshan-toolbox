#!/usr/bin/env node
// Minimal HTTPS downloader with redirect support.
// Usage: node scripts/fetch.mjs <url> <output-path>
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const [url, outArg] = process.argv.slice(2);
if (!url || !outArg) {
  console.error("usage: node scripts/fetch.mjs <url> <output-path>");
  process.exit(2);
}

const out = path.resolve(outArg);
await mkdir(path.dirname(out), { recursive: true });
const partial = `${out}.part`;
await rm(partial, { force: true });

const MAX_REDIRECTS = 8;

/** Follow redirects and stream the body to disk. */
function download(target, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      target,
      {
        timeout: 60_000,
        headers: {
          "user-agent": "devops-desktop-bootstrap/0.1",
          accept: "*/*",
        },
      },
      (res) => {
        const { statusCode = 0, headers } = res;
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error(`too many redirects for ${target}`));
            return;
          }
          const next = new URL(headers.location, target).toString();
          resolve(download(next, redirectsLeft - 1));
          return;
        }
        if (statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${statusCode} for ${target}`));
          return;
        }

        const total = Number(headers["content-length"] || 0);
        let received = 0;
        let lastPct = -10;
        const file = createWriteStream(partial);

        res.on("data", (chunk) => {
          received += chunk.length;
          if (total > 0) {
            const pct = Math.floor((received / total) * 100);
            if (pct >= lastPct + 10) {
              lastPct = pct;
              process.stdout.write(`\r${pct}% (${(received / 1048576).toFixed(1)} MB)`);
            }
          }
        });
        res.on("error", reject);
        file.on("error", reject);
        file.on("finish", async () => {
          try {
            const size = (await stat(partial)).size;
            if (total > 0 && size !== total) {
              throw new Error(`incomplete download: ${size}/${total} bytes`);
            }
            await rm(out, { force: true });
            await rename(partial, out);
            process.stdout.write(`\n`);
            console.log(`saved ${out} (${(size / 1048576).toFixed(1)} MB)`);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        res.pipe(file);
      },
    );
    req.on("timeout", () => req.destroy(new Error(`timeout for ${target}`)));
    req.on("error", reject);
  });
}

await download(url);
