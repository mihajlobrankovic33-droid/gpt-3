import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration for admin functions
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per hour for admin operations
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((userLimit.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

// Cleanup old entries periodically
let requestCount = 0;
function cleanupRateLimitMap() {
  requestCount++;
  if (requestCount % 50 === 0) {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }
}

// Cryptographically secure code generation
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  
  let code = "PRO-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(randomValues[i] % chars.length);
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get auth header and verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Morate biti prijavljeni" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user with auth client
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

    // Rate limiting check
    cleanupRateLimitMap();
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for admin user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Previše zahteva. Sačekajte pre ponovnog pokušaja." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfter || 3600)
          } 
        }
      );
    }

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.log(`Unauthorized admin access attempt by user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Nemate admin prava" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User is verified admin - process the request
    const { action, code, durationDays } = await req.json();

    console.log(`Admin action: ${action} by user: ${user.id}`);

    if (action === "list") {
      // List all pro codes
      const { data, error } = await supabase
        .from("pro_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ codes: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      // Generate a cryptographically secure code if not provided
      const newCode = code || generateCode();
      const days = durationDays || 30;

      const { data, error } = await supabase
        .from("pro_codes")
        .insert({
          code: newCode,
          duration_days: days,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Kod već postoji" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      console.log(`Pro code created: ${newCode} by admin: ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, code: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Kod je obavezan" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("pro_codes")
        .delete()
        .eq("code", code);

      if (error) throw error;

      console.log(`Pro code deleted: ${code} by admin: ${user.id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Nepoznata akcija" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
