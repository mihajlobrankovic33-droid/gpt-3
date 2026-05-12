import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LicenseValidationRequest {
  unique_code: string;
  device_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unique_code, device_id }: LicenseValidationRequest = await req.json();

    if (!unique_code || !device_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Nedostaju podaci za validaciju." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query license by unique_code
    const { data: license, error } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("unique_code", unique_code.toUpperCase().trim())
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ valid: false, error: "Greška pri proveri ključa." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generic error for invalid code (prevents enumeration)
    if (!license) {
      return new Response(
        JSON.stringify({ valid: false, error: "Neispravan licencni ključ." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if active
    if (!license.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: "Pristup je deaktiviran. Kontaktiraj Mihajla." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry (skip for admin code)
    const ADMIN_CODE = "BOSS-0000-XP";
    if (license.unique_code !== ADMIN_CODE && license.expiry_date) {
      const expiryDate = new Date(license.expiry_date);
      if (expiryDate < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, expired: true, error: "Vaš paket je istekao. Kontaktirajte Mihajla za novi paket." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check device lock
    if (license.device_id && license.device_id !== device_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Ovaj ključ je već povezan sa drugim uređajem. Kontaktiraj Mihajla." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lock device if not locked yet
    if (!license.device_id) {
      const { error: updateError } = await supabaseAdmin
        .from("licenses")
        .update({ device_id: device_id })
        .eq("id", license.id);

      if (updateError) {
        console.error("Error locking device:", updateError);
      } else {
        license.device_id = device_id;
      }
    }

    // Return sanitized license data (don't expose all fields)
    return new Response(
      JSON.stringify({
        valid: true,
        license: {
          id: license.id,
          user_name: license.user_name,
          avatar: license.avatar,
          is_active: license.is_active,
          expiry_date: license.expiry_date,
          unique_code: license.unique_code,
          device_id: license.device_id,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Greška pri validaciji." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
