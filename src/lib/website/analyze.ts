import { parse, type HTMLElement } from "node-html-parser";
import { normalizePhone } from "../audit/nap";
import type { WebsiteSignals } from "../audit/types";

/** Schema.org types that represent a local business (common subtypes only). */
const LOCAL_BUSINESS_TYPES = new Set(
  [
    "LocalBusiness", "AnimalShelter", "AutomotiveBusiness", "AutoRepair", "AutoDealer", "ChildCare", "Dentist",
    "DryCleaningOrLaundry", "EmergencyService", "EmploymentAgency", "EntertainmentBusiness", "FinancialService",
    "FoodEstablishment", "Bakery", "BarOrPub", "CafeOrCoffeeShop", "FastFoodRestaurant", "IceCreamShop", "Restaurant",
    "Winery", "GovernmentOffice", "HealthAndBeautyBusiness", "BeautySalon", "DaySpa", "HairSalon", "NailSalon",
    "HealthClub", "TattooParlor", "HomeAndConstructionBusiness", "Electrician", "GeneralContractor", "HVACBusiness",
    "HousePainter", "Locksmith", "MovingCompany", "Plumber", "RoofingContractor", "InternetCafe", "LegalService",
    "Attorney", "Notary", "Library", "LodgingBusiness", "Hotel", "MedicalBusiness", "MedicalClinic", "Optician",
    "Pharmacy", "Physician", "ProfessionalService", "RealEstateAgent", "SelfStorage", "ShoppingCenter",
    "SportsActivityLocation", "ExerciseGym", "Store", "TouristInformationCenter", "TravelAgency", "AccountingService",
    "InsuranceAgency", "VeterinaryCare", "Florist", "PetStore", "HardwareStore", "ClothingStore",
  ].map((t) => t.toLowerCase()),
);

const BOOKING_DOMAINS = [
  "calendly.com", "squareup.com/appointments", "square.site", "acuityscheduling.com", "setmore.com", "booksy.com",
  "vagaro.com", "mindbodyonline.com", "schedulicity.com", "zocdoc.com", "opentable.com", "resy.com", "toasttab.com",
  "doordash.com", "ubereats.com", "grubhub.com", "housecallpro.com", "jobber.com", "servicetitan.com", "fresha.com",
  "glossgenius.com", "localmed.com", "nexhealth.com", "simplepractice.com", "tock.com", "chownow.com",
];

const BOOKING_PHRASES = [
  "book online", "book now", "book an appointment", "schedule online", "schedule now", "schedule an appointment",
  "order online", "order now", "reserve a table", "make a reservation", "request an appointment",
];

const CTA_PHRASES = [
  ...BOOKING_PHRASES, "call now", "call us", "call today", "get a quote", "free quote", "request a quote", "free estimate",
  "get an estimate", "request service", "contact us", "get started", "schedule", "book", "order", "reserve",
];

const MAP_PATTERNS = ["google.com/maps", "maps.google.", "goo.gl/maps", "maps.app.goo.gl", "maps.apple.com", "openstreetmap.org", "bing.com/maps"];

// North American phone numbers in common formats.
const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\b([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g;

function collectSchemaTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectSchemaTypes(n, out));
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (typeof type === "string") out.add(type.toLowerCase());
  if (Array.isArray(type)) type.forEach((t) => typeof t === "string" && out.add(t.toLowerCase()));
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectSchemaTypes(value, out);
  }
}

function hasLocalBusinessSchema(root: HTMLElement): boolean {
  const types = new Set<string>();
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collectSchemaTypes(JSON.parse(script.textContent), types);
    } catch {
      // Malformed JSON-LD is ignored rather than failing the scan.
    }
  }
  for (const el of root.querySelectorAll("[itemtype]")) {
    const match = /schema\.org\/(\w+)/i.exec(el.getAttribute("itemtype") ?? "");
    if (match) types.add(match[1].toLowerCase());
  }
  return [...types].some((t) => LOCAL_BUSINESS_TYPES.has(t));
}

function extractPhones(root: HTMLElement, text: string): string[] {
  const phones = new Set<string>();
  for (const a of root.querySelectorAll('a[href^="tel:"]')) {
    const digits = normalizePhone(decodeURIComponent(a.getAttribute("href")!.slice(4)));
    if (digits.length === 10) phones.add(digits);
  }
  for (const match of text.matchAll(PHONE_REGEX)) {
    phones.add(`${match[1]}${match[2]}${match[3]}`);
  }
  return [...phones];
}

export interface AnalyzeContext {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  city: string;
}

/** Extract audit signals from a homepage's HTML. Pure and deterministic. */
export function analyzeHtml(html: string, ctx: AnalyzeContext): WebsiteSignals {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: false, pre: true } });

  const head = root.querySelector("head") ?? root;
  const meta = (selector: string) => head.querySelector(selector)?.getAttribute("content")?.trim() || undefined;

  const title = root.querySelector("title")?.textContent.trim() || undefined;
  const viewport = meta('meta[name="viewport"]') ?? "";

  const h1s = root.querySelectorAll("h1").map((h) => h.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);

  // Visible text only: drop scripts and styles before reading text.
  const body = (root.querySelector("body") ?? root).clone() as HTMLElement;
  body.querySelectorAll("script, style, template").forEach((el) => el.remove());
  const text = body.textContent.replace(/\s+/g, " ");
  const lowerText = text.toLowerCase();

  const links = root.querySelectorAll("a[href]");
  const hrefs = links.map((a) => (a.getAttribute("href") ?? "").toLowerCase());
  const clickableText = root
    .querySelectorAll("a, button, input[type=submit], input[type=button]")
    .map((el) => (el.textContent || el.getAttribute("value") || el.getAttribute("aria-label") || "").toLowerCase().replace(/\s+/g, " ").trim());
  const iframeSrcs = root.querySelectorAll("iframe[src]").map((f) => (f.getAttribute("src") ?? "").toLowerCase());
  const embeds = [...hrefs, ...iframeSrcs];

  const forms = root.querySelectorAll("form");
  const hasContactForm = forms.some(
    (f) =>
      f.querySelector("textarea") !== null ||
      f.querySelector('input[type="email"]') !== null ||
      f.querySelector('input[type="tel"]') !== null ||
      f.querySelector('input[name*="email" i], input[name*="phone" i]') !== null,
  );

  const images = root.querySelectorAll("img");

  return {
    url: ctx.url,
    finalUrl: ctx.finalUrl,
    statusCode: ctx.statusCode,
    responseTimeMs: ctx.responseTimeMs,
    https: ctx.finalUrl.startsWith("https://"),
    title,
    metaDescription: meta('meta[name="description"]'),
    hasViewport: /width\s*=\s*device-width/i.test(viewport),
    h1Count: h1s.length,
    h1Text: h1s.slice(0, 3),
    hasTelLink: hrefs.some((h) => h.startsWith("tel:")),
    phonesFound: extractPhones(root, text),
    hasContactForm,
    hasEmailLink: hrefs.some((h) => h.startsWith("mailto:")),
    hasLocalBusinessSchema: hasLocalBusinessSchema(root),
    mentionsCity: ctx.city.trim() !== "" && lowerText.includes(ctx.city.trim().toLowerCase()),
    imageCount: images.length,
    imagesMissingAlt: images.filter((img) => !img.hasAttribute("alt")).length,
    hasOpenGraph: head.querySelector('meta[property^="og:"]') !== null,
    hasMapEmbed: embeds.some((s) => MAP_PATTERNS.some((p) => s.includes(p))),
    hasBookingLink:
      embeds.some((s) => BOOKING_DOMAINS.some((d) => s.includes(d))) ||
      clickableText.some((t) => BOOKING_PHRASES.some((p) => t.includes(p))),
    hasCallToAction: hrefs.some((h) => h.startsWith("tel:")) || clickableText.some((t) => CTA_PHRASES.some((p) => t.includes(p))),
  };
}
