import { fetchCrimeMapping, normalizeCrimeMapping } from "../../../../lib/crimeMapping";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const getDateRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end };
};

const authorize = (request: Request) => {
  const secret = process.env.CRIME_INGEST_SECRET;
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
  const daysParam = url.searchParams.get("days");
  const days = Math.min(Math.max(Number(daysParam ?? "7"), 1), 30);

  const { start, end } = getDateRange(days);
  const payload = await fetchCrimeMapping(start, end);
  const normalized = normalizeCrimeMapping(payload.Data);

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
        typeId: incident.typeId,
        typeIconUrl: incident.typeIconUrl,
        mapItId: incident.mapItId,
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
        typeId: incident.typeId,
        typeIconUrl: incident.typeIconUrl,
        mapItId: incident.mapItId,
        disposition: incident.disposition,
        raw: incident.raw,
      },
    })
  );

  await prisma.$transaction(upserts);

  return Response.json({
    total: payload.Total,
    upserted: normalized.length,
  });
};

export async function GET(request: Request) {
  return ingest(request);
}

export async function POST(request: Request) {
  return ingest(request);
}
