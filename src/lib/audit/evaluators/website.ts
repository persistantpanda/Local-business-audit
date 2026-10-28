import { makeCheck, NO_WEBSITE_RECOMMENDATION, siteAccess, siteCheck } from "../checks";
import type { AuditInput, CheckResult } from "../types";

const HAS_WEBSITE = {
  id: "web_exists",
  label: "Business website",
  weight: 1,
  recommendation: NO_WEBSITE_RECOMMENDATION,
} as const;

const HTTPS = {
  id: "web_https",
  label: "Secure connection (HTTPS)",
  weight: 2,
  recommendation: {
    title: "Serve the website over HTTPS",
    description: "Browsers mark non-HTTPS sites as “Not secure”, which drives visitors away. Most hosts offer free SSL certificates.",
    impact: "high",
    effort: "low",
  },
} as const;

const MOBILE = {
  id: "web_mobile_viewport",
  label: "Mobile-friendly layout",
  weight: 2.5,
  recommendation: {
    title: "Make the website mobile-friendly",
    description:
      "The site is missing a responsive viewport setting, so phones will likely show a zoomed-out desktop layout. Most local searches happen on mobile.",
    impact: "high",
    effort: "medium",
  },
} as const;

const TITLE = {
  id: "web_title",
  label: "Page title",
  weight: 1.5,
  recommendation: {
    title: "Write a clear homepage title",
    description: "Use a 30–60 character title that names your main service and city, e.g. “Emergency Plumber in Springfield | Business Name”.",
    impact: "medium",
    effort: "low",
  },
} as const;

const META_DESCRIPTION = {
  id: "web_meta_description",
  label: "Search result description",
  weight: 1,
  recommendation: {
    title: "Add a meta description",
    description: "A 70–160 character summary shown in search results encourages clicks. Mention what you offer and a reason to choose you.",
    impact: "low",
    effort: "low",
  },
} as const;

const H1 = {
  id: "web_h1",
  label: "Main page heading",
  weight: 1,
  recommendation: {
    title: "Use one clear main heading",
    description: "The homepage should have a single main heading (H1) that says what you do, so visitors and search engines understand the page immediately.",
    impact: "low",
    effort: "low",
  },
} as const;

const SPEED = {
  id: "web_response_time",
  label: "Server response time",
  weight: 1.5,
  recommendation: {
    title: "Improve website loading speed",
    description:
      "The server was slow to deliver the homepage. Ask your host about caching or a faster plan; slow pages lose visitors, especially on mobile.",
    impact: "medium",
    effort: "medium",
  },
} as const;

const ALT_TEXT = {
  id: "web_image_alt",
  label: "Image descriptions (alt text)",
  weight: 0.5,
  recommendation: {
    title: "Add descriptions to images",
    description: "Alt text makes images accessible to screen readers and helps search engines understand your photos.",
    impact: "low",
    effort: "low",
  },
} as const;

const SOCIAL_PREVIEW = {
  id: "web_open_graph",
  label: "Social sharing preview",
  weight: 0.5,
  recommendation: {
    title: "Add social sharing tags",
    description: "Open Graph tags control the image and text shown when your site is shared on Facebook, text messages and other apps.",
    impact: "low",
    effort: "low",
  },
} as const;

export function evaluateWebsite(input: AuditInput): CheckResult[] {
  const access = siteAccess(input);
  if (access.kind === "none") {
    return [makeCheck(HAS_WEBSITE, "fail", "No website was found for this business.")];
  }

  return [
    siteCheck(HTTPS, access, (s) =>
      s.https
        ? makeCheck(HTTPS, "pass", "The site loads over a secure HTTPS connection.")
        : makeCheck(HTTPS, "fail", "The site does not use HTTPS."),
    ),
    siteCheck(MOBILE, access, (s) =>
      s.hasViewport
        ? makeCheck(MOBILE, "pass", "The page declares a responsive mobile viewport.")
        : makeCheck(MOBILE, "fail", "No responsive viewport setting was found."),
    ),
    siteCheck(TITLE, access, (s) => {
      const len = s.title?.trim().length ?? 0;
      if (!len) return makeCheck(TITLE, "fail", "The homepage has no title.");
      if (len < 15 || len > 65) return makeCheck(TITLE, "warn", `The title is ${len} characters (aim for 30–60): “${s.title}”.`);
      return makeCheck(TITLE, "pass", `Title: “${s.title}”.`);
    }),
    siteCheck(META_DESCRIPTION, access, (s) => {
      const len = s.metaDescription?.trim().length ?? 0;
      if (!len) return makeCheck(META_DESCRIPTION, "fail", "No meta description was found.");
      if (len < 50 || len > 170) return makeCheck(META_DESCRIPTION, "warn", `The description is ${len} characters (aim for 70–160).`);
      return makeCheck(META_DESCRIPTION, "pass", "A meta description of a good length is present.");
    }),
    siteCheck(H1, access, (s) => {
      if (s.h1Count === 0) return makeCheck(H1, "fail", "No main heading (H1) was found.");
      if (s.h1Count > 1) return makeCheck(H1, "warn", `${s.h1Count} main headings (H1) were found; one is clearer.`);
      return makeCheck(H1, "pass", `Main heading: “${s.h1Text[0] ?? ""}”.`);
    }),
    siteCheck(SPEED, access, (s) => {
      const secs = (s.responseTimeMs / 1000).toFixed(1);
      if (s.responseTimeMs <= 1500) return makeCheck(SPEED, "pass", `The homepage was delivered in ${secs}s.`);
      if (s.responseTimeMs <= 4000) return makeCheck(SPEED, "warn", `The homepage took ${secs}s to deliver.`);
      return makeCheck(SPEED, "fail", `The homepage took ${secs}s to deliver.`);
    }),
    siteCheck(ALT_TEXT, access, (s) => {
      if (s.imageCount === 0) return makeCheck(ALT_TEXT, "pass", "No images on the homepage needed descriptions.");
      const ratio = s.imagesMissingAlt / s.imageCount;
      const detail = `${s.imagesMissingAlt} of ${s.imageCount} images are missing alt text.`;
      if (ratio <= 0.1) return makeCheck(ALT_TEXT, "pass", detail);
      return makeCheck(ALT_TEXT, ratio <= 0.4 ? "warn" : "fail", detail);
    }),
    siteCheck(SOCIAL_PREVIEW, access, (s) =>
      s.hasOpenGraph
        ? makeCheck(SOCIAL_PREVIEW, "pass", "Social sharing (Open Graph) tags are present.")
        : makeCheck(SOCIAL_PREVIEW, "warn", "No social sharing (Open Graph) tags were found."),
    ),
  ];
}
