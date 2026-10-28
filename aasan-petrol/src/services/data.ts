import { supabase } from "../lib/supabase";

export async function listMyVehicles() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id);

    if (error || !data) return [];
    return data;
  } catch (e) {
    return [];
  }
}

