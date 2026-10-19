import { createClient } from "@/lib/supabase/server";
import { StudyNav } from "./StudyNav";

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <StudyNav signedIn={Boolean(user)} />;
}
