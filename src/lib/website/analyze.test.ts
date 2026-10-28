import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeHtml } from "./analyze";

const fixture = (name: string) => readFileSync(new URL(`../../../test/fixtures/${name}`, import.meta.url), "utf8");
const ctx = { url: "https://bluebird-bakery.example", finalUrl: "https://bluebird-bakery.example/", statusCode: 200, responseTimeMs: 500, city: "Port Alder" };

describe("analyzeHtml", () => {
  it("extracts signals from a well-built homepage", () => {
    const s = analyzeHtml(fixture("good-site.html"), ctx);
    expect(s.title).toBe("Fresh Bread & Pastries in Port Alder | Bluebird Bakery");
    expect(s.metaDescription).toMatch(/^Neighborhood bakery/);
    expect(s.hasViewport).toBe(true);
    expect(s.https).toBe(true);
    expect(s.h1Count).toBe(1);
    expect(s.h1Text[0]).toBe("Port Alder's neighborhood bakery");
    expect(s.hasTelLink).toBe(true);
    expect(s.hasLocalBusinessSchema).toBe(true);
    expect(s.mentionsCity).toBe(true);
    expect(s.hasContactForm).toBe(true);
    expect(s.hasEmailLink).toBe(true);
    expect(s.hasOpenGraph).toBe(true);
    expect(s.hasMapEmbed).toBe(true);
    expect(s.hasBookingLink).toBe(true);
    expect(s.hasCallToAction).toBe(true);
    // alt="" is valid for decorative images and is not counted as missing.
    expect(s.imageCount).toBe(2);
    expect(s.imagesMissingAlt).toBe(0);
  });

  it("only reads phone numbers from visible text and tel: links, not scripts", () => {
    const s = analyzeHtml(fixture("good-site.html"), ctx);
    expect(s.phonesFound).toEqual(["5555550177"]);
  });

  it("reports missing signals on a weak homepage", () => {
    const s = analyzeHtml(fixture("poor-site.html"), { ...ctx, finalUrl: "http://poor.example/" });
    expect(s.https).toBe(false);
    expect(s.hasViewport).toBe(false);
    expect(s.metaDescription).toBeUndefined();
    expect(s.h1Count).toBe(2);
    expect(s.hasTelLink).toBe(false);
    expect(s.phonesFound).toEqual([]);
    expect(s.hasContactForm).toBe(false);
    expect(s.hasLocalBusinessSchema).toBe(false);
    expect(s.mentionsCity).toBe(false);
    expect(s.imagesMissingAlt).toBe(2);
    expect(s.hasCallToAction).toBe(false);
  });

  it("tolerates malformed JSON-LD", () => {
    const html = `<html><head><script type="application/ld+json">{not json</script></head><body></body></html>`;
    expect(analyzeHtml(html, ctx).hasLocalBusinessSchema).toBe(false);
  });
});
