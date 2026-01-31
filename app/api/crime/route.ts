import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "250"), 1000);
  const source = url.searchParams.get("source");

  const where: Record<string, unknown> = {};
  if (since && !Number.isNaN(Date.parse(since))) {
    where.occurredAt = { gte: new Date(since) };
  }
  if (source) {
    where.source = source;
  }

  const incidents = await prisma.crimeIncident.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return Response.json({ data: incidents });
}
