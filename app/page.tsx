import { prisma } from "../lib/prisma";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
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

  return (
    <HomeClient
      initialReportsLast24h={reportsLast24h}
      initialVerifiedIncidents={verifiedIncidents}
    />
  );
}
