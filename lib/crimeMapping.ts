type CrimeMappingIncidentRaw = {
  ID: string | null;
  Type: string;
  Description: string;
  IncidentNum: string;
  Location: string;
  Agency: string;
  Date: number;
  MapIt: string;
  CrimeSingleValue: string | null;
  ResourcePath: string;
  VersionPath: string;
  IncludeLayoutScripts: boolean;
};

export type CrimeMappingResponse = {
  Data: CrimeMappingIncidentRaw[];
  Total: number;
  AggregateResults: unknown;
  Errors: unknown;
};

export type CrimeIncidentInput = {
  source: "crimemapping";
  sourceIncidentId: string;
  incidentNum: string | null;
  description: string;
  location: string;
  agency: string;
  occurredAt: Date | null;
  typeId: string | null;
  typeIconUrl: string | null;
  mapItId: string | null;
  raw: CrimeMappingIncidentRaw;
};

const CRIME_MAPPING_URL = "https://www.crimemapping.com/Map/CrimeIncidents_Read";

const DEFAULT_CATEGORIES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
];

const DEFAULT_SPATIAL_FILTER =
  "{\"rings\":[[[-9426211.818598758,5258790.627781184],[-9426211.818598758,5284320.595228398],[-9370374.569436513,5284320.595228398],[-9370374.569436513,5258790.627781184],[-9426211.818598758,5258790.627781184]]],\"spatialReference\":{\"wkid\":102100}}";

const typeIdRegex = /IncidentType\/Identify\/(\d+)\.svg/i;
const typeSrcRegex = /src="([^"]+)"/i;
const mapItRegex = /ReportMapIt\('([^']+)'\)/i;

const formatYmd = (date: Date) =>
  date.toISOString().slice(0, 10).replace(/-/g, "");

const parseCrimeDate = (value: number | null) => {
  if (!value) return null;
  const raw = String(value).padStart(14, "0");
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6)) - 1;
  const day = Number(raw.slice(6, 8));
  const hour = Number(raw.slice(8, 10));
  const minute = Number(raw.slice(10, 12));
  const second = Number(raw.slice(12, 14));
  return new Date(year, month, day, hour, minute, second);
};

export const buildParamFilt = (start: Date, end: Date) => ({
  SelectedCategories: DEFAULT_CATEGORIES,
  SpatialFilter: {
    FilterType: 2,
    Filter: DEFAULT_SPATIAL_FILTER,
  },
  TemporalFilter: {
    PreviousID: "3",
    PreviousNumDays: 7,
    PreviousName: "Previous Week",
    FilterType: "Previous",
    ExplicitStartDate: formatYmd(start),
    ExplicitEndDate: formatYmd(end),
  },
  AgencyFilter: [],
});

export const fetchCrimeMapping = async (start: Date, end: Date) => {
  const paramFilt = buildParamFilt(start, end);
  const body = new URLSearchParams({
    paramFilt: JSON.stringify(paramFilt),
  });

  const response = await fetch(CRIME_MAPPING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`CrimeMapping request failed: ${response.status}`);
  }

  return (await response.json()) as CrimeMappingResponse;
};

export const normalizeCrimeMapping = (data: CrimeMappingIncidentRaw[]) =>
  data.map((item) => {
    const typeMatch = item.Type?.match(typeIdRegex);
    const srcMatch = item.Type?.match(typeSrcRegex);
    const mapItMatch = item.MapIt?.match(mapItRegex);

    const typeId = typeMatch?.[1] ?? null;
    const typeIconUrl = srcMatch?.[1] ?? null;
    const mapItId = mapItMatch?.[1] ?? null;
    const occurredAt = parseCrimeDate(item.Date);

    const sourceIncidentId =
      mapItId ??
      `${item.IncidentNum ?? "unknown"}:${item.Description}:${item.Date}`;

    return {
      source: "crimemapping",
      sourceIncidentId,
      incidentNum: item.IncidentNum ?? null,
      description: item.Description ?? "Unknown",
      location: item.Location ?? "Unknown",
      agency: item.Agency ?? "Unknown",
      occurredAt,
      typeId,
      typeIconUrl,
      mapItId,
      raw: item,
    } satisfies CrimeIncidentInput;
  });
