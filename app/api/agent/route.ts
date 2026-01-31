import { handlePostAgent } from "../controllers/agentController";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handlePostAgent(request);
}
