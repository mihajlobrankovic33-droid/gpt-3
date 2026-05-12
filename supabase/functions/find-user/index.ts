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
    // Authentication check - require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError?.message || "No claims found");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claimsData.claims.sub;
    console.log("User lookup request from:", requestingUserId);

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to lookup user - bypasses RLS
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: targetProfile, error: lookupError } = await serviceClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (lookupError) {
      console.error("Profile lookup error:", lookupError.message);
      // Return generic error to prevent enumeration
      return new Response(
        JSON.stringify({ success: false, error: "Unable to find user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetProfile) {
      // IMPORTANT: Return same generic error whether user exists or not
      // This prevents email enumeration attacks
      console.log("User not found for email lookup");
      return new Response(
        JSON.stringify({ success: false, error: "Unable to find user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Don't allow users to find themselves
    if (targetProfile.user_id === requestingUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot start conversation with yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if conversation already exists between these users
    const { data: existingParticipation } = await serviceClient
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", requestingUserId);

    let existingConversationId: string | null = null;

    if (existingParticipation?.length) {
      for (const part of existingParticipation) {
        const { data: otherParticipant } = await serviceClient
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", part.conversation_id)
          .eq("user_id", targetProfile.user_id)
          .maybeSingle();

        if (otherParticipant) {
          existingConversationId = part.conversation_id;
          break;
        }
      }
    }

    console.log("User lookup successful for:", targetProfile.user_id);

    // Return only necessary data (no email exposed)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          user_id: targetProfile.user_id,
          display_name: targetProfile.display_name || "User",
        },
        existing_conversation_id: existingConversationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Find user error:", error);
    // Return generic error to prevent information leakage
    return new Response(
      JSON.stringify({ success: false, error: "Unable to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
