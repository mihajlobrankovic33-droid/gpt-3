import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `Ti si AI ekstraktor za brze puškice (cheat sheets).

TVOJ JEDINI ZADATAK: Izvuci SAMO ključne informacije iz slike.

EKSTRAHUJ SAMO:
• Formule (matematičke, fizičke, hemijske...)
• Definicije (kratke, jedna rečenica max)
• Datumi (istorijski događaji, godine)
• Ključne osobe (ko je šta uradio/otkrio)

FORMAT ODGOVORA - KRATKI BULLET POINTS:
• Svaki podatak u jednoj liniji
• Počni svaku liniju sa "• "
• Bez objašnjenja, bez teorije
• Bez uvoda, bez zaključka
• Čist tekst, BEZ zvezdica i markdown-a

PRIMER IZLAZA:
• E = mc² (formula za energiju mase)
• 1914 - početak Prvog svetskog rata
• Nikola Tesla - pronalazač naizmenične struje
• Mitohondrija - energetska centrala ćelije

PREDMET: [automatski prepoznaj iz slike]

Izvuci SVE relevantne podatke iz slike u bullet point formatu.`;

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

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    const { imageUrl, subject } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // Call AI to extract information from image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: EXTRACTION_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract study notes from this image for the subject: ${subject || "General"}. Be thorough but concise.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 900,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("AI API error:", errorData);
      throw new Error(errorData.error?.message || "AI extraction failed");
    }

    const data = await response.json();
    let extractedContent = data.choices?.[0]?.message?.content;

    if (!extractedContent) {
      throw new Error("No content extracted from image");
    }

    // Clean up any markdown symbols
    extractedContent = extractedContent
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/##/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '')
      .trim();

    // Extract subject from AI response
    let detectedSubject = subject || "Puškica";
    const subjectMatch = extractedContent.match(/^PREDMET:\s*(.+?)[\n\r]/i);
    if (subjectMatch) {
      detectedSubject = subjectMatch[1].trim().toUpperCase();
      // Remove the PREDMET line from content
      extractedContent = extractedContent.replace(/^PREDMET:\s*.+?[\n\r]+/i, '').trim();
    }

    console.log("Extraction successful for user:", userId, "subject:", detectedSubject);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: extractedContent,
        title: detectedSubject,
        subject: detectedSubject
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Extraction error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Extraction failed" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
