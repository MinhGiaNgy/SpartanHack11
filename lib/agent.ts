import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { prisma } from "./prisma";

/**
 * SYSTEM PROMPT
 * - Forces consistent Markdown structure with blank lines
 * - Prevents debug dumps (no "Field: value" lists)
 * - Tells model to only call DB tool when the user asked about incidents/trends
 */
const SYSTEM_PROMPT =
    "You are SpartaSafe, a campus safety assistant for Michigan State University.\n\n" +

    "CRITICAL RULE: If the user is NOT asking about incidents, trends, or \"latest/recent\" crimes, do NOT access the database tool.\n" +
    "Only use the database tool when the user asks for incident data (e.g., latest incident, recent incidents, trends, last 7 days, etc.).\n\n" +

    "Always respond in Markdown.\n" +
    "Use clear section headers and bullet lists.\n" +
    "ALWAYS include a blank line between sections.\n" +
    "Never output \"debug style\" key-value dumps like `Field: value` lines.\n\n" +

    "Answer only questions related to campus safety or incidents in the database.\n" +
    "General campus safety questions should be concise and on-topic.\n" +
    "If no incidents are found, provide a calm safety update rather than an error message.\n\n" +

    "When incident data is involved, ALWAYS use this exact structure and order:\n" +
    "## Summary\n" +
    "(2–3 concise sentences)\n\n" +
    "## Trends\n" +
    "- (1–4 bullet points)\n\n" +
    "## Notable incidents (max 5)\n" +
    "- **YYYY-MM-DD HH:mm (local)** — TYPE — GENERAL LOCATION — SOURCE/AGENCY\n\n" +
    "## Safety implication\n" +
    "- (one clear, practical sentence)\n\n" +
    "## Next actions\n" +
    "- (2–3 helpful follow-up options)\n\n" +

    "Always prioritize MSU relevance over off-campus details.\n" +
    "Use local time (America/Detroit), not UTC.\n" +
    "If more than five incidents are returned, summarize patterns instead of listing all results.\n" +
    "If the client need to continue, list the next 5 incidents, unless the list has exhausted.\n" +
    "Never dump raw records, internal IDs, database fields, coordinates, or null values.\n" +
    "Be calm, factual, and avoid speculation, alarmism, or system-related explanations.\n";

/**
 * SAFETY SCORE TOOL (static map)
 * - Keep as-is; tool returns JSON and model formats it.
 */
const getSafetyScore = tool(
    ({ location }) => {
        const scores: Record<string, { grade: string; score: string; note: string }> = {
            "wilson hall": { grade: "B+", score: "6/10", note: "Moderate traffic, stay alert after 10pm." },
            "munn field": { grade: "A-", score: "8/10", note: "Well-lit with steady patrols." },
            "grand river ave": { grade: "C+", score: "5/10", note: "Late-night incidents reported." },
            "baker hall": { grade: "B", score: "6/10", note: "Quiet after 10pm, walk with a buddy." },
            "river trail": { grade: "C", score: "4/10", note: "Low visibility after dusk." },
            "im west": { grade: "A", score: "8/10", note: "High foot traffic until midnight." },
        };

        const key = location.trim().toLowerCase();
        const result =
            scores[key] ?? { grade: "N/A", score: "N/A", note: "No campus safety score on record." };

        return JSON.stringify({ location, ...result });
    },
    {
        name: "get_safety_score",
        description: "Get the safety score for an MSU campus location.",
        schema: z.object({
            location: z.string().describe("Campus location or landmark."),
        }),
    }
);

/**
 * RECENT INCIDENTS TOOL
 * - Returns display-ready objects ONLY (no IDs, no sourceIncidentId, no raw coords, no nulls)
 * - Returns: { timeZone, window, count, notable[], typeCounts[], sourceCounts[] }
 * - The model will format into Markdown per SYSTEM_PROMPT.
 */
const getRecentIncidents = tool(
    async ({ source, limit, since }) => {
        // We can fetch up to 15 for trend calculation, but we only DISPLAY up to 5.
        const takeForAnalysis = Math.min(Math.max(limit ?? 15, 1), 15);

        const where: Record<string, unknown> = {};
        if (source) where.source = source;
        if (since && !Number.isNaN(Date.parse(since))) {
            where.occurredAt = { gte: new Date(since) };
        }

        // Pull only what we need for display + light aggregation
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

        const isLatLng = (s: string) => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s.trim());

        const normalizeSource = (s?: string | null) => {
            if (!s) return "Unknown source";
            if (s === "user_report") return "Community Report";
            if (s === "msu_clery") return "MSU Police (Clery)";
            if (s === "crimemapping") return "CrimeMapping";
            return s;
        };

        const normalizeDisposition = (d?: string | null) => {
            if (!d) return null;
            // If your DB stores "4 - Active" etc, keep the readable tail.
            // If it stores codes only, you can map them here.
            // Examples:
            // "2 - Arrest" => "Arrest made"
            // "4 - Active" => "Under investigation"
            const lower = d.toLowerCase();
            if (lower.includes("arrest")) return "Arrest made";
            if (lower.includes("active")) return "Under investigation";
            if (lower.includes("inactive")) return "Closed";
            return d;
        };

        const simplifyLocation = (loc?: string | null) => {
            if (!loc) return "Location not specified";
            const cleaned = loc.replace(/^\d+\s*BLOCK\s+/i, "").trim();
            if (isLatLng(cleaned)) return "Approx. location shared (near campus)";
            return cleaned;
        };

        const toDisplay = (x: typeof incidents[number]) => {
            const occurred = x.occurredAt ?? x.reportedAt ?? x.createdAt;
            const occurredLocal = occurred ? fmt.format(occurred) : null;

            const location = simplifyLocation(x.locationName ?? x.location);
            const sourceLabel = normalizeSource(x.source);
            const agency = x.agency || sourceLabel; // fall back

            const status = normalizeDisposition(x.disposition);

            return {
                occurredLocal, // "MM/DD/YYYY, HH:MM" (24h) in America/Detroit
                type: x.description || "Unknown incident type",
                location,
                source: sourceLabel,
                agency,
                status, // string | null
            };
        };

        const displayIncidents = incidents.map(toDisplay);

        // Aggregations for trends
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

        // Only show up to 5 notable items
        const notable = displayIncidents.slice(0, 5);

        return JSON.stringify({
            timeZone: tz,
            count: displayIncidents.length,
            notable,
            typeCounts,
            sourceCounts,
        });
    },
    {
        name: "get_recent_incidents",
        description:
            "Fetch recent incidents and return a human-friendly summary payload (no internal IDs, no raw fields).",
        schema: z.object({
            source: z.string().optional().describe("Optional: msu_clery, crimemapping, user_report"),
            limit: z.number().optional().describe("Max incidents to consider for trends (1-15)."),
            since: z.string().optional().describe("ISO date string (e.g., 2026-01-01)."),
        }),
    }
);

export async function buildAgent() {
    const model = new ChatOpenAI({
        model: "gpt-5-nano",
    });

    return createAgent({
        model,
        tools: [getSafetyScore, getRecentIncidents],
        systemPrompt: SYSTEM_PROMPT,
    });
}
