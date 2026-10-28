import { booleanCheck, makeCheck, siteAccess, siteCheck } from "../checks";
import type { AuditInput, CheckResult } from "../types";

const CLICK_TO_CALL = {
  id: "conv_click_to_call",
  label: "Tap-to-call phone link",
  weight: 2,
  recommendation: {
    title: "Make your phone number tap-to-call",
    description: "Link the phone number on your website (a “tel:” link) so mobile visitors can call with one tap. This is often the single biggest lead source for local businesses.",
    impact: "high",
    effort: "low",
  },
} as const;

const CONTACT = {
  id: "conv_contact_method",
  label: "Contact form or email link",
  weight: 1.5,
  recommendation: {
    title: "Add a simple contact or quote request form",
    description: "Some customers prefer not to call. A short form (name, phone, what they need) captures leads after hours.",
    impact: "high",
    effort: "low",
  },
} as const;

const CTA = {
  id: "conv_call_to_action",
  label: "Clear call to action",
  weight: 1.5,
  recommendation: {
    title: "Add a clear call to action",
    description: "Use prominent buttons such as “Call now”, “Book an appointment” or “Get a free quote” near the top of the homepage.",
    impact: "high",
    effort: "low",
  },
} as const;

const BOOKING = {
  id: "conv_online_booking",
  label: "Online booking or ordering",
  weight: 1,
  recommendation: {
    title: "Offer online booking, ordering or quote requests",
    description: "Letting customers book or order online removes friction and captures customers outside business hours.",
    impact: "medium",
    effort: "medium",
  },
} as const;

const DIRECTIONS = {
  id: "conv_map_directions",
  label: "Map or directions on website",
  weight: 1,
  recommendation: {
    title: "Add a map and directions",
    description: "Embed a map or link to directions on your contact page so customers can find you easily.",
    impact: "low",
    effort: "low",
  },
} as const;

const GBP_ACTION_LINK = {
  id: "conv_gbp_action_link",
  label: "Booking or quote link on Google profile",
  weight: 1,
  recommendation: {
    title: "Add a booking, ordering or quote link to your Google profile",
    description: "Google Business Profile supports appointment, ordering and quote links that appear directly in search results.",
    impact: "medium",
    effort: "low",
  },
} as const;

export function evaluateConversion(input: AuditInput): CheckResult[] {
  const access = siteAccess(input);
  const checks: CheckResult[] = [
    siteCheck(CLICK_TO_CALL, access, (s) =>
      s.hasTelLink
        ? makeCheck(CLICK_TO_CALL, "pass", "The homepage has a tap-to-call phone link.")
        : makeCheck(CLICK_TO_CALL, "fail", "No tap-to-call phone link was found."),
    ),
    siteCheck(CONTACT, access, (s) => {
      if (s.hasContactForm) return makeCheck(CONTACT, "pass", "A contact form was found on the homepage.");
      if (s.hasEmailLink) return makeCheck(CONTACT, "warn", "An email link was found, but no contact form.");
      return makeCheck(CONTACT, "fail", "No contact form or email link was found on the homepage.");
    }),
    siteCheck(CTA, access, (s) =>
      s.hasCallToAction
        ? makeCheck(CTA, "pass", "The homepage includes call-to-action buttons or links.")
        : makeCheck(CTA, "fail", "No clear call to action (such as “Book now” or “Get a quote”) was found."),
    ),
    siteCheck(BOOKING, access, (s) =>
      s.hasBookingLink
        ? makeCheck(BOOKING, "pass", "An online booking or ordering option was found.")
        : makeCheck(BOOKING, "warn", "No online booking or ordering option was detected."),
    ),
    siteCheck(DIRECTIONS, access, (s) =>
      s.hasMapEmbed
        ? makeCheck(DIRECTIONS, "pass", "A map or directions link was found.")
        : makeCheck(DIRECTIONS, "warn", "No map or directions link was found on the homepage."),
    ),
  ];

  if (input.gbp?.claimed !== false) {
    checks.push(
      booleanCheck(
        GBP_ACTION_LINK,
        input.gbp?.actionLinkSet,
        {
          pass: "The Google profile has a booking, ordering or quote link.",
          fail: "The Google profile has no booking, ordering or quote link.",
          unknown: "Google Business Profile details were not provided.",
        },
        "warn",
      ),
    );
  }

  return checks;
}
