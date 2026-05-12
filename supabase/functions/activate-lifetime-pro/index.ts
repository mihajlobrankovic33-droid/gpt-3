import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per hour (this is a sensitive operation)
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
  if (requestCount % 20 === 0) {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Morate biti prijavljeni" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Neispravna sesija" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check
    cleanupRateLimitMap();
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for lifetime pro activation by user: ${user.id}`);
      return new Response(
        JSON.stringify({ success: false, error: "Previše zahteva. Sačekajte pre ponovnog pokušaja." }),
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

    // Check admin role with service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      console.log(`Unauthorized lifetime pro attempt by user: ${user.id}`);
      return new Response(
        JSON.stringify({ success: false, error: "Nemate admin prava" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin verified - activate lifetime Pro
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        is_pro: true, 
        subscription_expiry_date: null 
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Lifetime Pro activated for admin: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error activating lifetime pro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
