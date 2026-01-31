import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { prisma } from "./prisma";

const SYSTEM_PROMPT =
  "You are SpartaSafe, a campus safety assistant for Michigan State University. " +
  "Use tools to look up safety scores and recent incidents. " +
  "Keep answers concise and avoid speculation.";

const getSafetyScore = tool(
  ({ location }) => {
    const scores: Record<string, { grade: string; score: string; note: string }> = {
      "wilson hall": {
        grade: "B+",
        score: "6/10",
        note: "Moderate traffic, stay alert after 10pm.",
      },
      "munn field": {
        grade: "A-",
        score: "8/10",
        note: "Well-lit with steady patrols.",
      },
      "grand river ave": {
        grade: "C+",
        score: "5/10",
        note: "Late-night incidents reported.",
      },
      "baker hall": {
        grade: "B",
        score: "6/10",
        note: "Quiet after 10pm, walk with a buddy.",
      },
      "river trail": {
        grade: "C",
        score: "4/10",
        note: "Low visibility after dusk.",
      },
      "im west": {
        grade: "A",
        score: "8/10",
        note: "High foot traffic until midnight.",
      },
    };

    const key = location.trim().toLowerCase();
    const result =
      scores[key] ?? {
        grade: "N/A",
        score: "N/A",
        note: "No campus safety score on record.",
      };

    return JSON.stringify({
      location,
      ...result,
    });
  },
  {
    name: "get_safety_score",
    description: "Get the safety score for a campus location.",
    schema: z.object({
      location: z.string().describe("Campus location or landmark."),
    }),
  }
);

const getRecentIncidents = tool(
  async ({ source, limit, since }) => {
    const take = Math.min(Math.max(limit ?? 10, 1), 50);
    const where: Record<string, unknown> = {};

    if (source) {
      where.source = source;
    }
    if (since && !Number.isNaN(Date.parse(since))) {
      where.occurredAt = { gte: new Date(since) };
    }

    const incidents = await prisma.crimeIncident.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take,
    });

    return JSON.stringify(incidents);
  },
  {
    name: "get_recent_incidents",
    description: "Fetch recent incidents from the database.",
    schema: z.object({
      source: z.string().optional().describe("msu_clery"),
      limit: z.number().optional().describe("Max results (1-50)."),
      since: z
        .string()
        .optional()
        .describe("ISO date string (e.g., 2026-01-01)."),
    }),
  }
);

const getMostRecentIncident = tool(
  async ({ source }) => {
    const where: Record<string, unknown> = {};
    if (source) {
      where.source = source;
    }

    const incident = await prisma.crimeIncident.findFirst({
      where,
      orderBy: [
        { occurredAt: "desc" },
        { reportedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return JSON.stringify(incident);
  },
  {
    name: "get_most_recent_incident",
    description: "Fetch the most recent incident from the database.",
    schema: z.object({
      source: z.string().optional().describe("msu_clery"),
    }),
  }
);

export async function buildAgent() {
  const model = new ChatOpenAI({
    model: "gpt-5-nano",
  });

  return createAgent({
    model,
    tools: [getSafetyScore, getRecentIncidents, getMostRecentIncident],
    systemPrompt: SYSTEM_PROMPT,
  });
}
