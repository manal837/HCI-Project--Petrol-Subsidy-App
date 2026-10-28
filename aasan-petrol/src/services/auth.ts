import { supabase } from "../lib/supabase";

export async function getCurrentUserProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  // Using maybeSingle() prevents 406 Not Acceptable errors when zero rows are returned
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      id: user.id,
      full_name: user.user_metadata?.full_name || "Driver",
      phone_number: user.user_metadata?.phone_number || "",
      role: "driver",
      approval_status: "approved",
    };
  }

  return data;
}

export async function signUpUser(
  phone: string,
  fullName: string,
  pin: string,
  cnic: string = "",
  registration: string = "",
  makeModel: string = "",
  vehicleType: string = "bike",
  fuelType: string = "petrol",
  role: string = "driver"
) {
  const cleanPhone = phone.trim().replace(/\s+/g, "");
  const email = `${cleanPhone}@aasanpetrol.local`;
  const password = `AP_${pin}_${cleanPhone}`.padEnd(8, "0");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: cleanPhone,
        cnic,
        vehicle_registration: registration,
        vehicle_model: makeModel,
        vehicle_type: vehicleType,
        fuel_type: fuelType,
        user_role: role,
      },
    },
  });

  if (error) {
    if (error.status === 400 && error.message.includes("already registered")) {
      return { profile: null, error: "Yeh mobile number pehle se registered hai. Login karein." };
    }
    return { profile: null, error: error.message };
  }

  return { profile: data.user, error: null };
}

export async function loginWithPhonePin(phone: string, pin: string) {
  const cleanPhone = phone.trim().replace(/\s+/g, "");
  const email = `${cleanPhone}@aasanpetrol.local`;
  const password = `AP_${pin}_${cleanPhone}`.padEnd(8, "0");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { session: null, error: error.message };
  }

  return { session: data.session, error: null };
}
