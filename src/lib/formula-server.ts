import type { createClient } from "./supabase/server";
import { dailyId } from "./daily-plan";
import { formulaDay, validFormulaPacket } from "./formula-schedule";

type StudyDB = Awaited<ReturnType<typeof createClient>>;
export const formulaPacketId = (userId: string, today: string) =>
  dailyId(`${userId}:formula-day:${today}`);

export async function loadFormulaDay(
  db: StudyDB,
  userId: string,
  today: string,
  testDate: string,
) {
  const [packet, keys] = await Promise.all([
    db
      .from("exam_attempts")
      .select("answers")
      .eq("id", formulaPacketId(userId, today))
      .eq("user_id", userId)
      .eq("exam_id", "formula:daily")
      .maybeSingle(),
    formulaChecks(db, userId),
  ]);
  if (packet.error)
    throw new Error("Your saved formulas could not load. Retry.");
  if (packet.data && !validFormulaPacket(packet.data.answers, today))
    throw new Error("Your formula session could not load. Retry.");
  const saved = packet.data?.answers as
    { date: string; ids: string[] } | undefined;
  return { day: formulaDay(keys, today, testDate, saved?.ids), saved: !!saved };
}

async function formulaChecks(db: StudyDB, userId: string) {
  const keys: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db
      .from("plan_checks")
      .select("item_key")
      .eq("user_id", userId)
      .like("item_key", "formula:%")
      .order("item_key")
      .range(offset, offset + 499);
    if (page.error)
      throw new Error("Your saved formula history could not load. Retry.");
    keys.push(...(page.data ?? []).map((row) => row.item_key));
    if (!page.data || page.data.length < 500) return keys;
    if (offset >= 99500)
      throw new Error(
        "Your formula history is too large to load safely. Contact support.",
      );
  }
}
