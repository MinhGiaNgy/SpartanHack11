import type { CrimeIncident } from "@prisma/client";
import type { CrimeIncidentDto } from "@/server/types/crime";

export function toDto(crime: CrimeIncident): CrimeIncidentDto {
  return {
    id: crime.id,
    source: crime.source,
    sourceIncidentId: crime.sourceIncidentId,
    incidentNum: crime.incidentNum,
    caseNumber: crime.caseNumber,
    offenseCode: crime.offenseCode,
    description: crime.description,
    location: crime.location,
    locationName: crime.locationName,
    address: crime.address,
    crossStreet: crime.crossStreet,
    agency: crime.agency,
    occurredAt: crime.occurredAt?.toISOString() ?? null,
    reportedAt: crime.reportedAt?.toISOString() ?? null,
    typeId: crime.typeId,
    typeIconUrl: crime.typeIconUrl,
    mapItId: crime.mapItId,
    disposition: crime.disposition,
  };
}

export function toDtos(crimes: CrimeIncident[]): CrimeIncidentDto[] {
  return crimes.map(toDto);
}
