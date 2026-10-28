import { booleanCheck, thresholdCheck, unknownCheck } from "../checks";
import type { AuditInput, CheckResult } from "../types";

const PHOTO_COUNT = {
  id: "photo_count",
  label: "Number of profile photos",
  weight: 2,
  recommendation: {
    title: "Add more high-quality photos",
    description:
      "Upload at least 25 photos showing your storefront, interior, team, products and completed work. Businesses with more photos tend to get more calls and direction requests.",
    impact: "high",
    effort: "low",
  },
} as const;

const LOGO = {
  id: "photo_logo",
  label: "Logo uploaded",
  weight: 1,
  recommendation: {
    title: "Upload your logo",
    description: "A logo makes the profile instantly recognizable and looks more professional.",
    impact: "low",
    effort: "low",
  },
} as const;

const COVER = {
  id: "photo_cover",
  label: "Cover photo set",
  weight: 1,
  recommendation: {
    title: "Choose a strong cover photo",
    description: "Pick a bright, well-composed image that represents the business — it's often the first thing customers see.",
    impact: "medium",
    effort: "low",
  },
} as const;

const PHOTO_RECENCY = {
  id: "photo_recency",
  label: "New photos in the last 90 days",
  weight: 1.5,
  recommendation: {
    title: "Add fresh photos every month",
    description: "Regular new photos show that the business is active and give customers a current view of your work.",
    impact: "medium",
    effort: "low",
  },
} as const;

const SOCIAL = {
  id: "presence_social",
  label: "Social media profiles",
  weight: 1.5,
  recommendation: {
    title: "Establish profiles on the social platforms your customers use",
    description: "Facebook and Instagram are a good start for most local businesses; Nextdoor works well for home services.",
    impact: "medium",
    effort: "medium",
  },
} as const;

const SOCIAL_ACTIVITY = {
  id: "presence_social_activity",
  label: "Recent social media activity",
  weight: 1,
  recommendation: {
    title: "Post on social media consistently",
    description: "An abandoned social profile can look like a closed business. Share a short update or photo at least weekly.",
    impact: "low",
    effort: "medium",
  },
} as const;

export function evaluatePhotosPresence(input: AuditInput): CheckResult[] {
  const photos = input.photos;
  const presence = input.presence;
  const checks: CheckResult[] = [];

  if (photos) {
    checks.push(
      thresholdCheck(PHOTO_COUNT, photos.totalPhotos, { pass: 25, warn: 10 }, (n) => `${n} ${n === 1 ? "photo" : "photos"} on the profile.`),
      booleanCheck(LOGO, photos.hasLogo, { pass: "A logo is uploaded.", fail: "No logo is uploaded." }),
      booleanCheck(COVER, photos.hasCoverPhoto, { pass: "A cover photo is set.", fail: "No cover photo is set." }),
      thresholdCheck(PHOTO_RECENCY, photos.photosLast90Days, { pass: 3, warn: 1 }, (n) =>
        n === 0 ? "No new photos in the last 90 days." : `${n} new ${n === 1 ? "photo" : "photos"} in the last 90 days.`,
      ),
    );
  } else {
    const reason = "Photo information was not provided.";
    checks.push(unknownCheck(PHOTO_COUNT, reason), unknownCheck(LOGO, reason), unknownCheck(COVER, reason), unknownCheck(PHOTO_RECENCY, reason));
  }

  const profiles = presence?.socialProfiles;
  if (profiles === undefined) {
    checks.push(unknownCheck(SOCIAL, "Social media information was not provided."));
  } else {
    checks.push(
      thresholdCheck(SOCIAL, profiles.length, { pass: 2, warn: 1 }, (n) =>
        n === 0 ? "No social media profiles were identified." : `Active on ${profiles.join(", ")}.`,
      ),
    );
    if (profiles.length > 0) {
      checks.push(
        booleanCheck(SOCIAL_ACTIVITY, presence?.postedToSocialLast30Days, {
          pass: "Posted to social media in the last 30 days.",
          fail: "No social media posts in the last 30 days.",
        }),
      );
    }
  }

  return checks;
}
