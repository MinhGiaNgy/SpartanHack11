import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const SYSTEM_PROMPT =
  "You are SpartaSafe, a campus safety assistant for Michigan State University. " +
  "Use tools to look up safety scores. Keep answers concise and avoid speculation.";

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

export async function buildAgent() {
  const model = new ChatOpenAI({
    model: "gpt-5-nano",
  });

  return createAgent({
    model,
    tools: [getSafetyScore],
    systemPrompt: SYSTEM_PROMPT,
  });
}
