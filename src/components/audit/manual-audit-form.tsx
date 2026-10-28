"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuditRequestError, requestAudit } from "@/lib/client/run-audit";
import { LISTING_SOURCES, SOCIAL_PLATFORMS, type ManualAuditForm } from "@/lib/providers/manual";
import { ChoiceField, FormSection, NumberField, SelectField, TextField, TriField } from "./form-fields";

type Form = ManualAuditForm;
type Listing = Form["listings"][number];

const INITIAL: Form = {
  business: { name: "", category: "", line1: "", line2: "", city: "", region: "", postalCode: "", phone: "", hasWebsite: "unknown", website: "" },
  gbp: {
    claimed: "unknown",
    primaryCategorySet: "unknown",
    additionalCategoriesCount: null,
    description: "unknown",
    hoursListed: "unknown",
    servicesListed: "unknown",
    postsLast30Days: null,
    websiteLinked: "unknown",
    actionLinkSet: "unknown",
  },
  reviews: { averageRating: null, totalReviews: null, reviewsLast90Days: null, responseRatePercent: null, lastReviewDate: null },
  photos: { totalPhotos: null, hasLogo: "unknown", hasCoverPhoto: "unknown", photosLast90Days: null },
  presence: { socialKnown: false, socialProfiles: [], postedToSocialLast30Days: "unknown" },
  listings: [],
};

const REQUIRED_FIELDS: [keyof Form["business"], string][] = [
  ["name", "Business name"],
  ["category", "Business category"],
  ["line1", "Street address"],
  ["city", "City"],
  ["region", "State"],
  ["phone", "Primary phone"],
];

const EMPTY_LISTING: Listing ={ source: "Yelp", otherSource: "", name: "", address: "", phone: "" };

export function ManualAuditFormView() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof Form>(section: K, patch: Partial<Form[K]>) {
    setForm((f) => ({ ...f, [section]: { ...(f[section] as object), ...patch } }));
    // Clear errors for fields the user has just edited.
    const edited = Object.keys(patch).map((k) => `${String(section)}.${k}`);
    setErrors((prev) => (edited.some((k) => k in prev) ? Object.fromEntries(Object.entries(prev).filter(([k]) => !edited.includes(k))) : prev));
  }
  const b = form.business;

  function setListing(index: number, patch: Partial<Listing>) {
    setForm((f) => ({ ...f, listings: f.listings.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  }

  function toggleSocial(platform: (typeof SOCIAL_PLATFORMS)[number]) {
    setForm((f) => {
      const current = f.presence.socialProfiles;
      const next = current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform];
      return { ...f, presence: { ...f.presence, socialKnown: true, socialProfiles: next } };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    // Instant feedback for required fields; the server validates everything again.
    const missing: Record<string, string> = {};
    for (const [key, label] of REQUIRED_FIELDS) if (!String(b[key] ?? "").trim()) missing[`business.${key}`] = `${label} is required`;
    if (b.phone.trim() && b.phone.replace(/\D/g, "").length < 10) missing["business.phone"] = "Enter a full phone number including area code";
    if (b.hasWebsite === "yes" && !b.website?.trim()) missing["business.website"] = "Enter the website address, or choose “No” or “Not sure”";
    if (Object.keys(missing).length) {
      setErrors(missing);
      setFormError("Some details are missing or invalid.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const report = await requestAudit({ source: "manual", data: form });
      router.push(`/reports/${report.id}`);
    } catch (err) {
      const fieldErrors: Record<string, string> = {};
      if (err instanceof AuditRequestError) {
        for (const d of err.details) fieldErrors[d.path.replace(/^data\./, "")] = d.message;
        setFormError(err.message);
      } else {
        setFormError("The audit could not be completed. Please try again.");
      }
      setErrors(fieldErrors);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
      {formError && (
        <div className="rounded-xl bg-fail-soft px-4 py-3 text-sm text-fail" role="alert">
          <strong>{formError}</strong>
          {Object.keys(errors).length > 0 && <span> Please review the highlighted fields.</span>}
        </div>
      )}

      <FormSection title="Business details" description="Used to check consistency across the website and listings.">
        <TextField label="Business name" required value={b.name} onChange={(v) => update("business", { name: v })} error={errors["business.name"]} autoComplete="organization" />
        <TextField label="Business category" required value={b.category} onChange={(v) => update("business", { category: v })} error={errors["business.category"]} placeholder="e.g. Plumber, Bakery, Dentist" />
        <TextField label="Street address" required value={b.line1} onChange={(v) => update("business", { line1: v })} error={errors["business.line1"]} autoComplete="address-line1" />
        <TextField label="Suite / unit" value={b.line2 ?? ""} onChange={(v) => update("business", { line2: v })} autoComplete="address-line2" />
        <TextField label="City" required value={b.city} onChange={(v) => update("business", { city: v })} error={errors["business.city"]} autoComplete="address-level2" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="State" required value={b.region} onChange={(v) => update("business", { region: v })} error={errors["business.region"]} autoComplete="address-level1" maxLength={40} />
          <TextField label="ZIP" value={b.postalCode ?? ""} onChange={(v) => update("business", { postalCode: v })} autoComplete="postal-code" maxLength={12} />
        </div>
        <TextField label="Primary phone" required type="tel" value={b.phone} onChange={(v) => update("business", { phone: v })} error={errors["business.phone"]} autoComplete="tel" maxLength={30} />
        <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
          <TriField label="Does the business have a website?" value={b.hasWebsite} onChange={(v) => update("business", { hasWebsite: v })} />
          {b.hasWebsite === "yes" && (
            <TextField
              label="Website address"
              required
              type="url"
              value={b.website ?? ""}
              onChange={(v) => update("business", { website: v })}
              error={errors["business.website"]}
              placeholder="www.example.com"
              hint="We'll scan the homepage automatically."
              maxLength={300}
            />
          )}
        </div>
      </FormSection>

      <FormSection title="Google Business Profile" description="Check the business's profile on Google Search or Maps. Choose “Not sure” for anything you can't confirm.">
        <TriField label="Is the profile claimed and verified?" value={form.gbp.claimed} onChange={(v) => update("gbp", { claimed: v })} />
        <TriField label="Is a primary category set?" value={form.gbp.primaryCategorySet} onChange={(v) => update("gbp", { primaryCategorySet: v })} />
        <TriField label="Are business hours listed?" value={form.gbp.hoursListed} onChange={(v) => update("gbp", { hoursListed: v })} />
        <TriField label="Are services or products listed?" value={form.gbp.servicesListed} onChange={(v) => update("gbp", { servicesListed: v })} />
        <TriField label="Does it link to the website?" value={form.gbp.websiteLinked} onChange={(v) => update("gbp", { websiteLinked: v })} />
        <TriField label="Booking, ordering or quote link?" value={form.gbp.actionLinkSet} onChange={(v) => update("gbp", { actionLinkSet: v })} />
        <ChoiceField
          label="Business description"
          value={form.gbp.description}
          onChange={(v) => update("gbp", { description: v })}
          options={[
            { value: "none", label: "None" },
            { value: "short", label: "Short" },
            { value: "detailed", label: "Detailed" },
            { value: "unknown", label: "Not sure" },
          ]}
          hint="Detailed means roughly 250 characters or more."
        />
        <NumberField label="Additional categories" value={form.gbp.additionalCategoriesCount} onChange={(v) => update("gbp", { additionalCategoriesCount: v })} max={20} />
        <NumberField label="Posts in the last 30 days" value={form.gbp.postsLast30Days} onChange={(v) => update("gbp", { postsLast30Days: v })} max={500} />
      </FormSection>

      <FormSection title="Reviews" description="From the business's Google profile.">
        <NumberField label="Average star rating" value={form.reviews.averageRating} onChange={(v) => update("reviews", { averageRating: v })} min={1} max={5} step={0.1} error={errors["reviews.averageRating"]} />
        <NumberField label="Total number of reviews" value={form.reviews.totalReviews} onChange={(v) => update("reviews", { totalReviews: v })} />
        <NumberField label="Reviews in the last 90 days" value={form.reviews.reviewsLast90Days} onChange={(v) => update("reviews", { reviewsLast90Days: v })} />
        <NumberField label="Share of reviews with an owner reply" value={form.reviews.responseRatePercent} onChange={(v) => update("reviews", { responseRatePercent: v })} max={100} suffix="%" error={errors["reviews.responseRatePercent"]} />
        <TextField
          label="Date of most recent review"
          type="date"
          value={form.reviews.lastReviewDate ?? ""}
          onChange={(v) => update("reviews", { lastReviewDate: v || null })}
          hint="Dates in the future are ignored."
          error={errors["reviews.lastReviewDate"]}
        />
      </FormSection>

      <FormSection title="Photos & social media">
        <NumberField label="Photos on the Google profile" value={form.photos.totalPhotos} onChange={(v) => update("photos", { totalPhotos: v })} />
        <NumberField label="New photos in the last 90 days" value={form.photos.photosLast90Days} onChange={(v) => update("photos", { photosLast90Days: v })} />
        <TriField label="Logo uploaded?" value={form.photos.hasLogo} onChange={(v) => update("photos", { hasLogo: v })} />
        <TriField label="Cover photo set?" value={form.photos.hasCoverPhoto} onChange={(v) => update("photos", { hasCoverPhoto: v })} />
        <fieldset className="sm:col-span-2">
          <legend className="block text-sm font-medium text-slate-700">Active social media profiles</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SOCIAL_PLATFORMS.map((p) => {
              const checked = form.presence.socialProfiles.includes(p);
              return (
                <label
                  key={p}
                  className={`flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                    checked ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-700"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleSocial(p)} />
                  {p}
                </label>
              );
            })}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300"
              checked={form.presence.socialKnown}
              onChange={(e) => update("presence", { socialKnown: e.target.checked, socialProfiles: e.target.checked ? form.presence.socialProfiles : [] })}
            />
            I&apos;ve checked — this is the complete list (including none)
          </label>
        </fieldset>
        {form.presence.socialProfiles.length > 0 && (
          <TriField label="Posted to social media in the last 30 days?" value={form.presence.postedToSocialLast30Days} onChange={(v) => update("presence", { postedToSocialLast30Days: v })} />
        )}
      </FormSection>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Directory listings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Copy the business name, address and phone exactly as each directory shows them. We&apos;ll compare them with the
          details above.
        </p>
        <div className="mt-5 space-y-4">
          {form.listings.map((l, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Directory" value={l.source} onChange={(v) => setListing(i, { source: v })} options={LISTING_SOURCES} />
                {l.source === "Other" ? (
                  <TextField label="Directory name" value={l.otherSource ?? ""} onChange={(v) => setListing(i, { otherSource: v })} maxLength={60} />
                ) : (
                  <div className="hidden sm:block" />
                )}
                <TextField label="Name as listed" value={l.name ?? ""} onChange={(v) => setListing(i, { name: v })} />
                <TextField label="Phone as listed" type="tel" value={l.phone ?? ""} onChange={(v) => setListing(i, { phone: v })} maxLength={30} />
                <div className="sm:col-span-2">
                  <TextField label="Address as listed" value={l.address ?? ""} onChange={(v) => setListing(i, { address: v })} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, listings: f.listings.filter((_, j) => j !== i) }))}
                className="mt-3 text-sm font-medium text-fail hover:underline"
              >
                Remove listing
              </button>
            </div>
          ))}
          {form.listings.length < 12 && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, listings: [...f.listings, { ...EMPTY_LISTING }] }))}
              className="inline-flex h-11 items-center rounded-lg border border-dashed border-slate-400 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              + Add a listing
            </button>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Anything left blank or “Not sure” is excluded from scoring, not guessed.</p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:bg-slate-400"
          >
            {submitting ? (b.hasWebsite === "yes" ? "Scanning website and running audit…" : "Running audit…") : "Run audit"}
          </button>
        </div>
      </div>
    </form>
  );
}
