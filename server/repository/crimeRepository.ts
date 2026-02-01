import type { Prisma, CrimeIncident } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QueryFilters = {
  since?: string;
  limit: number;
  source?: string;
};

function buildSinceFilter(since?: string): Prisma.CrimeIncidentWhereInput | undefined {
  if (!since) return undefined;
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return undefined;

  return {
    OR: [
      { occurredAt: { gte: sinceDate } },
      { reportedAt: { gte: sinceDate } },
      { createdAt: { gte: sinceDate } },
    ],
  };
}

export const crimeRepository = {
  async findMany(filters: QueryFilters): Promise<CrimeIncident[]> {
    const where: Prisma.CrimeIncidentWhereInput = {};

    if (filters.source) {
      where.source = filters.source;
    }

    const sinceFilter = buildSinceFilter(filters.since);
    if (sinceFilter) {
      Object.assign(where, sinceFilter);
    }

    return prisma.crimeIncident.findMany({
      where,
      orderBy: {
        occurredAt: "desc",
      },
      take: filters.limit,
    });
  },
};
