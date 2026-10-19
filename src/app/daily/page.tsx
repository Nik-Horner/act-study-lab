import { DailyStudy } from "@/components/DailyStudy";
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  return (
    <DailyStudy
      runner
      initialView={view === "formulas" ? "formulas" : "lesson"}
    />
  );
}
