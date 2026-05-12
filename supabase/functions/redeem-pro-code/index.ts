import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, deviceId } = await req.json();

    if (!code || !deviceId) {
      return new Response(
        JSON.stringify({ error: "Kod i device ID su obavezni" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Morate biti prijavljeni" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Neispravna sesija" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if code exists and is not used
    const { data: proCode, error: codeError } = await supabase
      .from("pro_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .maybeSingle();

    if (codeError) throw codeError;

    // Use generic error message to prevent code enumeration attacks
    // Do not reveal whether the code exists, is used, or used by a different device
    if (!proCode || (proCode.is_used && proCode.used_by_device_id !== deviceId)) {
      return new Response(
        JSON.stringify({ error: "Kod nije validan ili je već iskorišćen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If code is used by same device and still valid, return success
    if (proCode.is_used && proCode.used_by_device_id === deviceId) {
      if (proCode.expires_at && new Date(proCode.expires_at) > new Date()) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Već imate aktivan Pro status",
            expiresAt: proCode.expires_at 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + proCode.duration_days);

    // Claim the code
    const { error: updateError } = await supabase
      .from("pro_codes")
      .update({
        is_used: true,
        used_by_user_id: user.id,
        used_by_device_id: deviceId,
        used_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", proCode.id);

    if (updateError) throw updateError;

    // Update user's profile to Pro
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_pro: true,
        subscription_expiry_date: expiresAt.toISOString(),
      })
      .eq("user_id", user.id);

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pro aktiviran! Važi do ${expiresAt.toLocaleDateString("sr-RS")}`,
        expiresAt: expiresAt.toISOString(),
        durationDays: proCode.duration_days
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
