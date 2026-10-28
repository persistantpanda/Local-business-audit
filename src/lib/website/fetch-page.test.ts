import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Integration test against a real local HTTP server. DNS and the address
 * guard are mocked so "site.test" resolves to the local server and
 * "internal.test" resolves to a blocked private address; everything else
 * (sockets, redirects, decompression, limits) runs for real.
 */
vi.mock("node:dns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns")>();
  const table: Record<string, string> = { "site.test": "127.0.0.1", "internal.test": "10.0.0.5" };
  const lookup = (hostname: string, options: { all?: boolean }, cb: (...args: unknown[]) => void) => {
    const address = table[hostname];
    if (!address) return cb(Object.assign(new Error("not found"), { code: "ENOTFOUND" }));
    return options?.all ? cb(null, [{ address, family: 4 }]) : cb(null, address, 4);
  };
  return { ...actual, default: { ...actual, lookup }, lookup };
});

vi.mock("./address-guard", () => ({
  isBlockedAddress: (address: string) => address.startsWith("10."),
  isAllowedPort: () => true,
}));

const { fetchPage } = await import("./fetch-page");

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    switch (req.url) {
      case "/":
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end("<html><head><title>Home</title></head><body>Hi</body></html>");
      case "/gzip":
        res.writeHead(200, { "Content-Type": "text/html", "Content-Encoding": "gzip" });
        return res.end(gzipSync("<html><title>Compressed</title></html>"));
      case "/redirect":
        res.writeHead(301, { Location: "/" });
        return res.end();
      case "/redirect-internal":
        res.writeHead(302, { Location: "http://internal.test/" });
        return res.end();
      case "/redirect-loop":
        res.writeHead(302, { Location: "/redirect-loop" });
        return res.end();
      case "/big":
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(`<html><title>Big</title>${"x".repeat(50_000)}</html>`);
      case "/image":
        res.writeHead(200, { "Content-Type": "image/png" });
        return res.end("png");
      case "/slow":
        setTimeout(() => res.end("<html></html>"), 2_000);
        return;
      default:
        res.writeHead(404, { "Content-Type": "text/html" });
        return res.end("not found");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://site.test:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

describe("fetchPage", () => {
  it("fetches an HTML page", async () => {
    const res = await fetchPage(`${base}/`);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.html).toContain("<title>Home</title>");
      expect(res.statusCode).toBe(200);
      expect(res.responseTimeMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("decompresses gzip responses", async () => {
    const res = await fetchPage(`${base}/gzip`);
    expect(res.ok && res.html).toContain("Compressed");
  });

  it("follows redirects and reports the final URL", async () => {
    const res = await fetchPage(`${base}/redirect`);
    expect(res.ok && res.finalUrl).toBe(`${base}/`);
  });

  it("refuses redirects that resolve to private addresses", async () => {
    const res = await fetchPage(`${base}/redirect-internal`);
    expect(res).toEqual({ ok: false, error: "the address is not publicly reachable" });
  });

  it("stops after too many redirects", async () => {
    expect(await fetchPage(`${base}/redirect-loop`, { maxRedirects: 3 })).toEqual({
      ok: false,
      error: "the website redirected too many times",
    });
  });

  it("caps the downloaded size", async () => {
    const res = await fetchPage(`${base}/big`, { maxBytes: 1_000 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.html.length).toBe(1_000);
      expect(res.html).toContain("<title>Big</title>");
    }
  });

  it("reports HTTP errors, non-HTML responses, timeouts and unknown domains", async () => {
    expect(await fetchPage(`${base}/missing`)).toEqual({ ok: false, error: "the website returned an error (HTTP 404)" });
    expect(await fetchPage(`${base}/image`)).toEqual({ ok: false, error: "the address did not return a web page" });
    expect(await fetchPage(`${base}/slow`, { timeoutMs: 200 })).toEqual({ ok: false, error: "the website took too long to respond" });
    expect(await fetchPage("http://nowhere.test/")).toEqual({ ok: false, error: "the domain name could not be found" });
  });
});
