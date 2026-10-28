import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { Readable } from "node:stream";
import { isAllowedPort, isBlockedAddress } from "./address-guard";

export interface FetchPageOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

export type FetchPageResult =
  | { ok: true; html: string; finalUrl: string; statusCode: number; responseTimeMs: number }
  | { ok: false; error: string };

const USER_AGENT = "LocalBusinessAuditBot/0.1 (website quality check)";

export class UnsafeUrlError extends Error {}

/** Validate and normalize a user-supplied website address. */
export function normalizeWebsiteUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new UnsafeUrlError("no website address was given");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new UnsafeUrlError("that doesn't look like a valid website address");
  }
  assertSafeUrl(url);
  return url;
}

function assertSafeUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("only http and https website addresses can be scanned");
  }
  if (url.username || url.password) throw new UnsafeUrlError("website addresses with credentials are not allowed");
  if (!isAllowedPort(url.port)) {
    throw new UnsafeUrlError("only websites on standard ports can be scanned");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("the address is not publicly reachable");
  }
  if (isIP(host) && isBlockedAddress(host)) throw new UnsafeUrlError("the address is not publicly reachable");
}

/**
 * DNS lookup that refuses private or reserved addresses. Because the check
 * runs inside the socket's own lookup, the address we validate is the one
 * we connect to — closing the DNS-rebinding gap of a separate pre-check.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = (addresses as unknown as LookupAddress[]).filter((a) => !isBlockedAddress(a.address));
    if (!list.length) {
      const blockedErr = Object.assign(new Error("Address is not publicly reachable"), { code: "EBLOCKED" });
      return callback(blockedErr, "", 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function decode(stream: Readable, encoding: string | undefined): Readable {
  switch ((encoding ?? "").trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return stream.pipe(createGunzip());
    case "deflate":
      return stream.pipe(createInflate());
    case "br":
      return stream.pipe(createBrotliDecompress());
    default:
      return stream;
  }
}

interface RawResponse {
  statusCode: number;
  location?: string;
  contentType: string;
  body: string;
}

function requestOnce(url: URL, signal: AbortSignal, maxBytes: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.8",
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;
        const contentType = String(res.headers["content-type"] ?? "");
        if (statusCode >= 300 && statusCode < 400) {
          res.resume();
          return resolve({ statusCode, location, contentType, body: "" });
        }
        if (!/html|xml/i.test(contentType) && contentType !== "") {
          res.resume();
          return resolve({ statusCode, contentType, body: "" });
        }

        const chunks: Buffer[] = [];
        let size = 0;
        const stream = decode(res, res.headers["content-encoding"] as string | undefined);
        stream.on("data", (chunk: Buffer) => {
          const remaining = maxBytes - size;
          size += chunk.length;
          if (size > maxBytes) {
            // Keep the first maxBytes: the head and top of the page hold most signals.
            chunks.push(chunk.subarray(0, Math.max(remaining, 0)));
            stream.destroy();
            req.destroy();
            return resolve({ statusCode, contentType, body: Buffer.concat(chunks).toString("utf8") });
          }
          chunks.push(chunk);
        });
        stream.on("end", () => resolve({ statusCode, contentType, body: Buffer.concat(chunks).toString("utf8") }));
        stream.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function describeError(err: unknown): string {
  const e = err as NodeJS.ErrnoException;
  if (e?.name === "AbortError" || e?.code === "ABORT_ERR") return "the website took too long to respond";
  switch (e?.code) {
    case "EBLOCKED":
      return "the address is not publicly reachable";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "the domain name could not be found";
    case "ECONNREFUSED":
      return "the server refused the connection";
    case "ECONNRESET":
      return "the connection was interrupted";
    case "CERT_HAS_EXPIRED":
      return "the website's security certificate has expired";
    case "ERR_TLS_CERT_ALTNAME_INVALID":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return "the website's security certificate is not valid";
    default:
      return "the website could not be reached";
  }
}

/** Fetch a public web page safely for analysis. Never throws. */
export async function fetchPage(rawUrl: string, options: FetchPageOptions = {}): Promise<FetchPageResult> {
  const { timeoutMs = 10_000, maxBytes = 1_500_000, maxRedirects = 5 } = options;
  let url: URL;
  try {
    url = normalizeWebsiteUrl(rawUrl);
  } catch (err) {
    return { ok: false, error: err instanceof UnsafeUrlError ? err.message : "invalid website address" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const res = await requestOnce(url, controller.signal, maxBytes);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.location) {
        const next = new URL(res.location, url);
        assertSafeUrl(next);
        url = next;
        continue;
      }
      if (res.statusCode >= 400) return { ok: false, error: `the website returned an error (HTTP ${res.statusCode})` };
      if (!res.body) return { ok: false, error: "the address did not return a web page" };
      return {
        ok: true,
        html: res.body,
        finalUrl: url.toString(),
        statusCode: res.statusCode,
        responseTimeMs: Math.round(performance.now() - started),
      };
    }
    return { ok: false, error: "the website redirected too many times" };
  } catch (err) {
    if (err instanceof UnsafeUrlError) return { ok: false, error: err.message };
    return { ok: false, error: describeError(err) };
  } finally {
    clearTimeout(timer);
  }
}
