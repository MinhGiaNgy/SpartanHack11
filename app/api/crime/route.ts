import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "250"), 1000);

  const where =
    since && !Number.isNaN(Date.parse(since))
      ? { occurredAt: { gte: new Date(since) } }
      : {};

  const incidents = await prisma.crimeIncident.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return Response.json({ data: incidents });
}
