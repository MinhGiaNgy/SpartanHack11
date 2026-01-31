import { fetchClery, normalizeClery } from "../../../../lib/clery";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const authorize = (request: Request) => {
  const secret = process.env.CLERY_INGEST_SECRET;
  if (!secret) return true;

  const header = request.headers.get("x-crime-secret");
  const url = new URL(request.url);
  const query = url.searchParams.get("secret");

  return header === secret || query === secret;
};

const ingest = async (request: Request) => {
  if (!authorize(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const start = Number(url.searchParams.get("start") ?? "0");
  const length = Math.min(Number(url.searchParams.get("length") ?? "250"), 1000);

  const payload = await fetchClery({ start, length });
  const normalized = normalizeClery(payload.data);

  const upserts = normalized.map((incident) =>
    prisma.crimeIncident.upsert({
      where: { sourceIncidentId: incident.sourceIncidentId },
      update: {
        incidentNum: incident.incidentNum,
        caseNumber: incident.caseNumber,
        offenseCode: incident.offenseCode,
        description: incident.description,
        location: incident.location,
        locationName: incident.locationName,
        address: incident.address,
        crossStreet: incident.crossStreet,
        agency: incident.agency,
        occurredAt: incident.occurredAt,
        reportedAt: incident.reportedAt,
        disposition: incident.disposition,
        raw: incident.raw,
      },
      create: {
        source: incident.source,
        sourceIncidentId: incident.sourceIncidentId,
        incidentNum: incident.incidentNum,
        caseNumber: incident.caseNumber,
        offenseCode: incident.offenseCode,
        description: incident.description,
        location: incident.location,
        locationName: incident.locationName,
        address: incident.address,
        crossStreet: incident.crossStreet,
        agency: incident.agency,
        occurredAt: incident.occurredAt,
        reportedAt: incident.reportedAt,
        disposition: incident.disposition,
        raw: incident.raw,
      },
    })
  );

  await prisma.$transaction(upserts);

  return Response.json({
    total: payload.recordsTotal,
    ingested: normalized.length,
  });
};

export async function GET(request: Request) {
  return ingest(request);
}

export async function POST(request: Request) {
  return ingest(request);
}
