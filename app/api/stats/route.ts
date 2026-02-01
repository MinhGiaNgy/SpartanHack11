import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [reportsLast24h, verifiedIncidents] = await prisma.$transaction([
      prisma.crimeIncident.count({
        where: {
          OR: [
            { occurredAt: { gte: since } },
            { reportedAt: { gte: since } },
            { createdAt: { gte: since } },
          ],
        },
      }),
      prisma.crimeIncident.count({
        where: { source: "msu_clery" },
      }),
    ]);

    return Response.json({ reportsLast24h, verifiedIncidents });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
