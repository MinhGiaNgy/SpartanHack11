import { handleGetIncidents, handleCreateIncident } from "@/server/controllers/incidentController";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleGetIncidents(request);
}

export async function POST(request: Request) {
  return handleCreateIncident(request);
}
