import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { campaignCatalog } from "@/lib/campaign";
import { Campaign } from "@/components/Campaign";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string; subject?: string }>;
}) {
  const query = await searchParams,
    db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login?next=/play");
  const catalog = campaignCatalog();
  if (query.mission && !catalog.some((m) => m.id === query.mission)) notFound();
  return (
    <Campaign
      key={`${user.id}:${query.mission ?? query.subject ?? "map"}`}
      ownerId={user.id}
      catalog={catalog}
      missionId={query.mission}
      selectedSubject={query.subject}
    />
  );
}
