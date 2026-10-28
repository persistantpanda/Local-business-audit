import { z } from "zod";
import { manualAuditSchema } from "@/lib/providers/manual";
import { auditDemoBusiness, auditManualBusiness } from "@/lib/server/audit-service";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { BodyTooLargeError, readBodyLimited } from "@/lib/server/read-body";

const MAX_BODY_BYTES = 64 * 1024;

const requestSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("demo"), businessId: z.string().min(1).max(100) }),
  z.object({ source: z.literal("manual"), data: manualAuditSchema }),
]);

function error(status: number, message: string, details?: unknown, headers?: HeadersInit) {
  return Response.json({ error: message, details }, { status, headers });
}

export async function POST(request: Request) {
  let body: string;
  try {
    body = await readBodyLimited(request, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof BodyTooLargeError) return error(413, "The request is too large.");
    return error(400, "The request body could not be read.");
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return error(400, "The request body must be valid JSON.");
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return error(
      422,
      "Some details are missing or invalid.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }

  if (parsed.data.source === "demo") {
    const report = await auditDemoBusiness(parsed.data.businessId);
    return report ? Response.json({ report }) : error(404, "That demonstration business was not found.");
  }

  // Manual audits may trigger an outbound website scan, so they are rate limited.
  const limit = rateLimit(`audit:${clientKey(request)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return error(429, "Too many audits in a short time. Please wait a few minutes and try again.", undefined, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  try {
    const report = await auditManualBusiness(parsed.data.data);
    return Response.json({ report });
  } catch (err) {
    console.error("Audit failed", err);
    return error(500, "Something went wrong while running the audit. Please try again.");
  }
}
