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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase environment secrets");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // Prepare body for Gemini
    const base64Data = imageUrl.split(",")[1];
    const mimeType = imageUrl.split(";")[0].split(":")[1];

    const body = {
      system_instruction: {
        parts: [{ text: EXTRACTION_PROMPT }]
      },
      contents: [{
        role: "user",
        parts: [
          { text: `Extract study notes from this image for the subject: ${subject || "General"}. Be thorough but concise.` },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      }
    };

    // Call AI to extract information from image
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error("AI extraction failed via Gemini API");
    }

    const data = await response.json();
    let extractedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
