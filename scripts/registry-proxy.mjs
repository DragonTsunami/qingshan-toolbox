#!/usr/bin/env node
// Local sparse-registry proxy for Cargo.
//
// The Windows sandbox on this machine gives curl/schannel no TLS credentials,
// so cargo cannot talk to crates.io directly. Node uses OpenSSL and works, so
// this proxy fetches the sparse index and crate archives over HTTPS and serves
// them to cargo over plain HTTP on loopback only.
//
// Usage: node scripts/registry-proxy.mjs
import http from "node:http";
import https from "node:https";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.REGISTRY_PROXY_PORT || 18731);
const UPSTREAM = process.env.REGISTRY_UPSTREAM || "https://rsproxy.cn";
const CACHE_DIR = path.join(ROOT, ".toolchain", "registry-cache");
const INDEX_CACHE = path.join(CACHE_DIR, "index");
const CRATE_CACHE = path.join(CACHE_DIR, "crates");

await mkdir(INDEX_CACHE, { recursive: true });
await mkdir(CRATE_CACHE, { recursive: true });

const inflight = new Map();

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

/** GET with redirects, resolving to the response stream. */
function getStream(url, redirectsLeft = 6) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        timeout: 60_000,
        headers: {
          "user-agent": "opsdeck-cargo-proxy/0.1",
          accept: "*/*",
          "accept-encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error(`too many redirects: ${url}`));
            return;
          }
          resolve(getStream(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
          return;
        }
        resolve(res);
      },
    );
    req.on("timeout", () => req.destroy(new Error(`timeout: ${url}`)));
    req.on("error", reject);
  });
}

async function readBody(stream, limit = 32 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > limit) throw new Error("upstream body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function fetchIndex(relPath) {
  const cacheFile = path.join(INDEX_CACHE, relPath.replace(/^\/index\//, ""));
  try {
    return await readFile(cacheFile);
  } catch {
    // not cached
  }
  const stream = await getStream(`${UPSTREAM}/index/${relPath}`);
  if ((stream.statusCode || 0) !== 200) {
    stream.resume();
    const error = new Error(`upstream HTTP ${stream.statusCode}`);
    error.status = stream.statusCode;
    throw error;
  }
  const body = await readBody(stream);
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, body);
  return body;
}

function cachePathForCrate(name, version) {
  return path.join(CRATE_CACHE, `${name}-${version}.crate`);
}

async function downloadCrate(name, version) {
  const cacheFile = cachePathForCrate(name, version);
  try {
    const info = await stat(cacheFile);
    return { file: cacheFile, size: info.size, cached: true };
  } catch {
    // not cached
  }

  const key = `${name}@${version}`;
  if (!inflight.has(key)) {
    inflight.set(
      key,
      (async () => {
        const url = `${UPSTREAM}/api/v1/crates/${encodeURIComponent(name)}/${encodeURIComponent(version)}/download`;
        const stream = await getStream(url);
        const status = stream.statusCode || 0;
        if (status !== 200) {
          stream.resume();
          const error = new Error(`crate download HTTP ${status}`);
          error.status = status;
          throw error;
        }
        const partial = `${cacheFile}.part`;
        await new Promise((resolve, reject) => {
          const file = createWriteStream(partial);
          stream.pipe(file);
          stream.on("error", reject);
          file.on("error", reject);
          file.on("finish", resolve);
        });
        const { rename, rm } = await import("node:fs/promises");
        await rm(cacheFile, { force: true });
        await rename(partial, cacheFile);
        const info = await stat(cacheFile);
        return { file: cacheFile, size: info.size, cached: false };
      })().finally(() => inflight.delete(key)),
    );
  }
  return inflight.get(key);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  log("req", req.method, url.pathname, req.headers["user-agent"] || "-");
  try {
    if (url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if (url.pathname === "/index/config.json") {
      const body = JSON.parse(await fetchIndex("config.json"));
      body.dl = `http://127.0.0.1:${PORT}/dl`;
      const payload = Buffer.from(JSON.stringify(body));
      res.writeHead(200, {
        "content-type": "application/json",
        "content-length": payload.length,
      });
      res.end(payload);
      return;
    }

    if (url.pathname.startsWith("/index/")) {
      const rel = url.pathname.slice("/index/".length);
      const body = await fetchIndex(rel);
      res.writeHead(200, {
        "content-type": "text/plain",
        "content-length": body.length,
      });
      res.end(body);
      return;
    }

    if (url.pathname.startsWith("/dl/")) {
      const match = url.pathname.match(/^\/dl\/([^/]+)\/([^/]+)\/download$/);
      if (!match) {
        res.writeHead(400);
        res.end("bad crate path");
        return;
      }
      const [, name, version] = match;
      const { file, size } = await downloadCrate(name, version);
      if (size === 0) {
        res.writeHead(502);
        res.end("empty crate archive");
        return;
      }
      res.writeHead(200, {
        "content-type": "application/x-tar",
        "content-length": size,
      });
      const stream = (await import("node:fs")).createReadStream(file);
      stream.pipe(res);
      stream.on("error", (error) => {
        log("stream error", error.message);
        res.destroy(error);
      });
      return;
    }

    res.writeHead(404);
    res.end("not found");
  } catch (error) {
    log("request failed", req.url, error.message);
    if (!res.headersSent) res.writeHead(error.status || 500);
    res.end(String(error.message || error));
  }
});

server.on("connection", (socket) => {
  log("tcp connection", socket.remoteAddress, socket.remotePort);
});
server.on("clientError", (error, socket) => {
  log("client error", error.code, error.message);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.listen(PORT, "127.0.0.1", () => {
  log(`cargo registry proxy listening on http://127.0.0.1:${PORT}/index/`);
  log(`upstream: ${UPSTREAM}`);
});
