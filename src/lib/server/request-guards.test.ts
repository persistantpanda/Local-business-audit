import { describe, expect, it } from "vitest";
import { clientKey, rateLimit } from "./rate-limit";
import { BodyTooLargeError, readBodyLimited } from "./read-body";

function streamingRequest(chunks: string[], headers: Record<string, string> = {}): Request {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
  return new Request("http://localhost/api/audits", { method: "POST", body, headers, duplex: "half" } as RequestInit);
}

describe("readBodyLimited", () => {
  it("returns the body when it is within the limit", async () => {
    expect(await readBodyLimited(streamingRequest(['{"a":', "1}"]), 100)).toBe('{"a":1}');
  });

  it("rejects an oversized body while streaming, without a content-length", async () => {
    await expect(readBodyLimited(streamingRequest(["x".repeat(60), "x".repeat(60)]), 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("rejects early when the declared content-length is too large", async () => {
    const req = new Request("http://localhost/", { method: "POST", body: "small", headers: { "content-length": "999999" } });
    await expect(readBodyLimited(req, 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

  it("prefers the proxy-set x-real-ip header", () => {
    expect(clientKey(req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9");
  });

  it("uses the last x-forwarded-for hop, which a client cannot forge", () => {
    expect(clientKey(req({ "x-forwarded-for": "6.6.6.6, 198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("does not let a forged first hop create a fresh rate-limit bucket", () => {
    const key = (forged: string) => clientKey(req({ "x-forwarded-for": `${forged}, 198.51.100.8` }));
    expect(key("1.2.3.4")).toBe(key("5.6.7.8"));
  });

  it("falls back to a shared bucket when no address is known", () => {
    expect(clientKey(req({}))).toBe("anonymous");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit per window, then blocks until it resets", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 1000, 0).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, 1).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, 2)).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect(rateLimit(key, 2, 1000, 1000).ok).toBe(true);
  });
});
