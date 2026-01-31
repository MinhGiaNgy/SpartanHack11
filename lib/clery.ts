export type CleryRow = [
  string, // offense description
  string, // offense code
  string | null, // location name
  string | null, // address
  string | null, // cross street
  string | null, // occurred at
  string | null, // reported at
  string | null, // case number
  string | null // disposition
];

export type CleryResponse = {
  draw: string;
  recordsTotal: string;
  recordsFiltered: number;
  data: CleryRow[];
};

export type CleryIncidentInput = {
  source: "msu_clery";
  sourceIncidentId: string;
  incidentNum: string | null;
  caseNumber: string | null;
  offenseCode: string | null;
  description: string;
  location: string;
  locationName: string | null;
  address: string | null;
  crossStreet: string | null;
  latitude: number | null;
  longitude: number | null;
  agency: string;
  occurredAt: Date | null;
  reportedAt: Date | null;
  disposition: string | null;
  raw: CleryRow;
};

const CLERY_URL = "https://go.msu.edu/clery.php";

const parseDateTime = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const fetchClery = async ({
  start = 0,
  length = 100,
  draw = 1,
}: {
  start?: number;
  length?: number;
  draw?: number;
}) => {
  const body = new URLSearchParams({
    draw: String(draw),
    start: String(start),
    length: String(length),
    "search[value]": "",
    "search[regex]": "false",
  });

  const response = await fetch(CLERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Clery request failed: ${response.status}`);
  }

  return (await response.json()) as CleryResponse;
};

export const normalizeClery = (rows: CleryRow[]): CleryIncidentInput[] =>
  rows.map((row) => {
    const [
      description,
      offenseCode,
      locationName,
      address,
      crossStreet,
      occurredAtRaw,
      reportedAtRaw,
      caseNumber,
      disposition,
    ] = row;

    const occurredAt = parseDateTime(occurredAtRaw);
    const reportedAt = parseDateTime(reportedAtRaw);
    const locationPieces = [locationName, address].filter(Boolean);
    const location = locationPieces.join(" - ") || address || locationName || "Unknown";

    const sourceIncidentId =
      caseNumber ??
      `${description}:${location}:${occurredAtRaw ?? "unknown"}`;

    return {
      source: "msu_clery",
      sourceIncidentId,
      incidentNum: caseNumber ?? null,
      caseNumber: caseNumber ?? null,
      offenseCode: offenseCode ?? null,
      description: description ?? "Unknown",
      location,
      locationName: locationName ?? null,
      address: address ?? null,
      crossStreet: crossStreet ?? null,
      latitude: null,
      longitude: null,
      agency: "MSU Police",
      occurredAt,
      reportedAt,
      disposition: disposition ?? null,
      raw: row,
    };
  });
