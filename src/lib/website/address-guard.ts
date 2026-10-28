import { BlockList, isIP } from "node:net";

/**
 * Addresses the website scanner must never connect to: loopback, private
 * networks, link-local (including cloud metadata endpoints), carrier-grade
 * NAT, multicast, documentation and other reserved ranges.
 */
const blocked = new BlockList();

const IPV4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const IPV6_RANGES: [string, number][] = [
  // Unspecified, loopback and deprecated IPv4-compatible addresses.
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];

for (const [addr, prefix] of IPV4_RANGES) blocked.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of IPV6_RANGES) blocked.addSubnet(addr, prefix, "ipv6");

/** IPv4-mapped / -compatible IPv6 (e.g. ::ffff:127.0.0.1) → embedded IPv4. */
function embeddedIpv4(address: string): string | null {
  const dotted = /^(?:0{0,4}:){0,5}(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address.replace(/^::/, ""));
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

export function isBlockedAddress(address: string): boolean {
  const bare = address.replace(/^\[|\]$/g, "").split("%")[0];
  const family = isIP(bare);
  if (family === 4) return blocked.check(bare, "ipv4");
  if (family === 6) {
    const v4 = embeddedIpv4(bare.toLowerCase());
    if (v4 && isIP(v4) === 4) return blocked.check(v4, "ipv4");
    // Any other ::ffff:* form we failed to decode is treated as unsafe.
    if (/^::ffff:/i.test(bare)) return true;
    return blocked.check(bare, "ipv6");
  }
  // Not an IP literal: callers must resolve hostnames first.
  return true;
}

/** The scanner only connects to standard web ports. */
export function isAllowedPort(port: string): boolean {
  return port === "" || port === "80" || port === "443";
}
