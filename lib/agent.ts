import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";

const MODEL_NAME = "gemini-2.5-flash-lite-preview-09-2025";

const SYSTEM_PROMPT =
  "You are SpartaSafe, a campus safety assistant for Michigan State University.\n\n" +
  "Only access the database when the user asks about incidents, trends, or recent crimes.\n" +
  "If no incidents are found, provide a calm safety update rather than an error.\n\n" +
  "Always respond in Markdown.\n" +
  "Use clear section headers and bullet lists.\n" +
  "ALWAYS include a blank line between sections.\n" +
  "Never output debug-style key-value dumps.\n\n" +
  "When incident data is involved, ALWAYS use this exact structure and order:\n" +
  "## Summary\n" +
  "(2-3 concise sentences)\n\n" +
  "## Trends\n" +
  "- (1-4 bullet points)\n\n" +
  "## Notable incidents (max 5)\n" +
  "- **YYYY-MM-DD HH:mm (local)** - TYPE - GENERAL LOCATION - SOURCE/AGENCY\n\n" +
  "## Safety implication\n" +
  "- (one clear, practical sentence)\n\n" +
  "## Next actions\n" +
  "- (2-3 helpful follow-up options)\n\n" +
  "Use local time (America/Detroit), not UTC.\n" +
  "Never dump raw records, internal IDs, coordinates, or null values.\n" +
  "Be calm, factual, and avoid speculation or alarmism.";

const safetyScores: Record<string, { grade: string; score: string; note: string }> = {
  "wilson hall": { grade: "B+", score: "6/10", note: "Moderate traffic, stay alert after 10pm." },
  "munn field": { grade: "A-", score: "8/10", note: "Well-lit with steady patrols." },
  "grand river ave": { grade: "C+", score: "5/10", note: "Late-night incidents reported." },
  "baker hall": { grade: "B", score: "6/10", note: "Quiet after 10pm, walk with a buddy." },
  "river trail": { grade: "C", score: "4/10", note: "Low visibility after dusk." },
  "im west": { grade: "A", score: "8/10", note: "High foot traffic until midnight." },
};

const isIncidentQuery = (input: string) =>
  /\b(incident|incidents|crime|crimes|recent|latest|trend|trends|last\s+\d+|past\s+\d+|last\s+week|past\s+week|today|yesterday)\b/i.test(
    input
  );

const isSafetyScoreQuery = (input: string) =>
  /\b(safety\s*score|score|grade)\b/i.test(input);

const getSafetyScore = (location: string) => {
  const key = location.trim().toLowerCase();
  return (
    safetyScores[key] ?? {
      grade: "N/A",
      score: "N/A",
      note: "No campus safety score on record.",
    }
  );
};

const getRecentIncidents = async (source?: string, limit = 15, since?: string) => {
  const takeForAnalysis = Math.min(Math.max(limit, 1), 15);

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (since && !Number.isNaN(Date.parse(since))) {
    where.occurredAt = { gte: new Date(since) };
  }

  const incidents = await prisma.crimeIncident.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { reportedAt: "desc" }, { createdAt: "desc" }],
    take: takeForAnalysis,
    select: {
      source: true,
      description: true,
      location: true,
      locationName: true,
      agency: true,
      occurredAt: true,
      reportedAt: true,
      disposition: true,
      createdAt: true,
    },
  });

  const tz = "America/Detroit";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const normalizeSource = (s?: string | null) => {
    if (!s) return "Unknown source";
    if (s === "user_report") return "Community Report";
    if (s === "msu_clery") return "MSU Police (Clery)";
    return s;
  };

  const normalizeDisposition = (d?: string | null) => {
    if (!d) return null;
    const lower = d.toLowerCase();
    if (lower.includes("arrest")) return "Arrest made";
    if (lower.includes("active")) return "Under investigation";
    if (lower.includes("inactive")) return "Closed";
    return d;
  };

  const simplifyLocation = (loc?: string | null) => {
    if (!loc) return "Location not specified";
    const cleaned = loc.replace(/^\d+\s*BLOCK\s+/i, "").trim();
    return cleaned || "Location not specified";
  };

  const displayIncidents = incidents.map((x) => {
    const occurred = x.occurredAt ?? x.reportedAt ?? x.createdAt;
    const occurredLocal = occurred ? fmt.format(occurred) : null;
    const location = simplifyLocation(x.locationName ?? x.location);
    const sourceLabel = normalizeSource(x.source);
    const agency = x.agency || sourceLabel;
    const status = normalizeDisposition(x.disposition);

    return {
      occurredLocal,
      type: x.description || "Unknown incident type",
      location,
      source: sourceLabel,
      agency,
      status,
    };
  });

  const typeCountsMap = new Map<string, number>();
  const sourceCountsMap = new Map<string, number>();
  for (const i of displayIncidents) {
    typeCountsMap.set(i.type, (typeCountsMap.get(i.type) ?? 0) + 1);
    sourceCountsMap.set(i.source, (sourceCountsMap.get(i.source) ?? 0) + 1);
  }

  const typeCounts = Array.from(typeCountsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => ({ type, count }));

  const sourceCounts = Array.from(sourceCountsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([source, count]) => ({ source, count }));

  const notable = displayIncidents.slice(0, 5);

  return {
    timeZone: tz,
    count: displayIncidents.length,
    notable,
    typeCounts,
    sourceCounts,
  };
};

const buildPrompt = (input: string, context?: Record<string, unknown>) => {
  if (!context) {
    return `${SYSTEM_PROMPT}\n\nUser: ${input}`;
  }
  return `${SYSTEM_PROMPT}\n\nUser: ${input}\n\nContext JSON:\n${JSON.stringify(context)}`;
};

export const runAgent = async (input: string) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY/GOOGLE_API_KEY in environment.");
  }

  const wantsIncidents = isIncidentQuery(input);
  const wantsSafety = isSafetyScoreQuery(input) && !wantsIncidents;

  const context: Record<string, unknown> = {};
  if (wantsIncidents) {
    context.incidents = await getRecentIncidents("msu_clery");
  }
  if (wantsSafety) {
    const match = input.match(/score\s+for\s+(.+)/i);
    const location = match?.[1] ?? input;
    context.safetyScore = getSafetyScore(location);
  }

  const prompt = buildPrompt(input, Object.keys(context).length ? context : undefined);

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  const text = (response as { text?: string }).text ?? "";
  return text || "Sorry, I couldn't generate a response just now.";
};