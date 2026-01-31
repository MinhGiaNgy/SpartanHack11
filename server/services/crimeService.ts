import { crimeRepository, type QueryFilters } from "@/server/repository/crimeRepository";
import type { CrimeIncident } from "@prisma/client";

export async function getCrimes(filters: QueryFilters): Promise<CrimeIncident[]> {
  // Business logic here if needed (validation, transformations, etc.)
  return crimeRepository.findMany(filters);
}
