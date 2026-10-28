import { makeCheck, maxThresholdCheck, thresholdCheck, unknownCheck } from "../checks";
import type { AuditInput, CheckResult } from "../types";

const RATING = {
  id: "rev_rating",
  label: "Average star rating",
  weight: 3,
  recommendation: {
    title: "Raise your average rating",
    description:
      "Review recent low ratings for recurring issues and fix the root causes. Then make it easy for satisfied customers to leave reviews — most people only review when asked.",
    impact: "high",
    effort: "high",
  },
} as const;

const VOLUME = {
  id: "rev_volume",
  label: "Total number of reviews",
  weight: 2.5,
  recommendation: {
    title: "Build a steady review request process",
    description:
      "Ask every happy customer for a review with a direct link (text or email right after the job). More reviews increase trust and are a known local ranking factor.",
    impact: "high",
    effort: "medium",
  },
} as const;

const RECENCY = {
  id: "rev_recency",
  label: "Most recent review",
  weight: 2,
  recommendation: {
    title: "Keep reviews coming in every month",
    description: "Customers give more weight to recent reviews. A regular request routine keeps your profile fresh.",
    impact: "medium",
    effort: "low",
  },
} as const;

const VELOCITY = {
  id: "rev_velocity",
  label: "New reviews in the last 90 days",
  weight: 1.5,
  recommendation: {
    title: "Increase the pace of new reviews",
    description: "Aim for at least two new reviews per month. Add review requests to receipts, follow-up emails and invoices.",
    impact: "medium",
    effort: "low",
  },
} as const;

const RESPONSES = {
  id: "rev_response_rate",
  label: "Owner responses to reviews",
  weight: 2,
  recommendation: {
    title: "Respond to every review",
    description:
      "Thank positive reviewers and reply calmly and helpfully to negative ones. Responses show prospective customers that you care and can soften the impact of a bad review.",
    impact: "medium",
    effort: "low",
  },
} as const;

export function evaluateReviews(input: AuditInput): CheckResult[] {
  const r = input.reviews;
  const specs = [RATING, VOLUME, RECENCY, VELOCITY, RESPONSES];
  if (!r) return specs.map((s) => unknownCheck(s, "Review information was not provided."));

  if (r.totalReviews === 0) {
    // With no reviews, rating, recency and response checks don't apply.
    return [makeCheck(VOLUME, "fail", "The business has no reviews yet.")];
  }

  return [
    thresholdCheck(RATING, r.averageRating, { pass: 4.5, warn: 4.0 }, (n) => `Average rating is ${n.toFixed(1)} stars.`),
    thresholdCheck(VOLUME, r.totalReviews, { pass: 50, warn: 15 }, (n) => `${n} total ${n === 1 ? "review" : "reviews"}.`),
    maxThresholdCheck(RECENCY, r.daysSinceLastReview, { pass: 30, warn: 90 }, (n) =>
      n === 0 ? "The latest review was posted today." : `The latest review was ${n} ${n === 1 ? "day" : "days"} ago.`,
    ),
    thresholdCheck(VELOCITY, r.reviewsLast90Days, { pass: 6, warn: 2 }, (n) => `${n} new ${n === 1 ? "review" : "reviews"} in the last 90 days.`),
    thresholdCheck(RESPONSES, r.responseRatePercent, { pass: 80, warn: 40 }, (n) => `The owner responded to about ${Math.round(n)}% of reviews.`),
  ];
}
