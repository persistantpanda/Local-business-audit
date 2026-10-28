import { describe, expect, it } from "vitest";
import { isBlockedAddress } from "./address-guard";
import { normalizeWebsiteUrl } from "./fetch-page";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "[::1]",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows public %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe("normalizeWebsiteUrl", () => {
  it("adds https:// when no scheme is given", () => {
    expect(normalizeWebsiteUrl("example.com").toString()).toBe("https://example.com/");
  });

  it.each([
    "ftp://example.com",
    "file:///etc/passwd",
    "http://localhost:3000",
    "http://user:pass@example.com",
    "http://example.com:8080",
    "http://127.0.0.1",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data",
    "http://printer.local",
    "",
  ])("rejects %s", (url) => {
    expect(() => normalizeWebsiteUrl(url)).toThrow();
  });
});
