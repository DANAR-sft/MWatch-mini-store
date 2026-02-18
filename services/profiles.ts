import { createClient } from "@/lib/supabase/server";
import { IProfile } from "@/types/definitions";

export async function getProfileById(id: string): Promise<IProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.log("Error fetching profile:", error.message);
    return null;
  }

  return data;
}
