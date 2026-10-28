import { describe, expect, it } from "vitest";
import { compareAddress, compareName, comparePhone, formatPhone, normalizePhone } from "./nap";

const address = { line1: "418 Quay Street", line2: "Suite 2", city: "Port Alder", region: "DS", postalCode: "00012", country: "US" };

describe("phone normalization", () => {
  it("ignores formatting and the +1 country code", () => {
    expect(normalizePhone("+1 (555) 555-0142")).toBe("5555550142");
    expect(comparePhone("555.555.0142", "(555) 555-0142")).toBe("match");
    expect(comparePhone("555-555-0142", "555-555-0199")).toBe("mismatch");
    expect(formatPhone("5555550142")).toBe("(555) 555-0142");
  });
});

describe("name comparison", () => {
  it("treats legal suffixes, punctuation and & vs and as equivalent", () => {
    expect(compareName("Harborview Plumbing Co.", "Harborview Plumbing")).toBe("match");
    expect(compareName("Oak & Iron Fitness", "Oak and Iron Fitness")).toBe("match");
  });
  it("flags extended names as partial and different names as mismatches", () => {
    expect(compareName("Bluebird Bakery", "Bluebird Bakery & Cafe Downtown")).toBe("partial");
    expect(compareName("Harborview Plumbing", "Harbor View Plumbing & Drain")).toBe("mismatch");
  });
});

describe("address comparison", () => {
  it("normalizes abbreviations", () => {
    expect(compareAddress(address, "418 Quay St Ste 2, Port Alder, DS 00012")).toBe("match");
    expect(compareAddress(address, "418 Quay St. #2, Port Alder, DS 00012")).toBe("match");
  });
  it("treats a missing suite as partial and a different street as a mismatch", () => {
    expect(compareAddress(address, "418 Quay St, Port Alder, DS 00012")).toBe("partial");
    expect(compareAddress(address, "11 Foundry Lane, Port Alder, DS 00012")).toBe("mismatch");
  });
});
