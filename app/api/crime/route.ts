import { handleGetCrimes } from "@/server/controllers/crimeController";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleGetCrimes(request);
}
