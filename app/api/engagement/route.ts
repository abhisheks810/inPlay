import { getCurrentUser } from "@/app/auth";
import { getEngagementMetrics, recordEngagementEvent } from "@/modules/engagement/repository";
import { parseEngagementEvent } from "@/modules/engagement/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId")?.trim();
  if (!videoId || videoId.length > 120) {
    return Response.json({ error: "A valid videoId is required." }, { status: 400 });
  }

  try {
    return Response.json({ metrics: await getEngagementMetrics(videoId) });
  } catch (error) {
    console.error("Unable to load engagement metrics", error);
    return Response.json({ error: "Engagement metrics are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const event = parseEngagementEvent(await request.json().catch(() => null));
  if (!event) return Response.json({ error: "Invalid engagement event." }, { status: 400 });

  try {
    const user = await getCurrentUser();
    await recordEngagementEvent(event, user?.userId ?? null);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to record engagement event", error);
    return Response.json({ error: "Engagement could not be recorded." }, { status: 503 });
  }
}
