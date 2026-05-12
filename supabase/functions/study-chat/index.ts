import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are StudyGPT, a friendly and patient AI tutor designed to help students learn.

Your core behaviors:
- Act as a warm, encouraging, and patient tutor
- Explain topics clearly and step by step
- Adapt your explanations to the student's grade level (if unknown, ask)
- Help with homework by GUIDING the student, not just giving answers - ask questions to help them think
- Create helpful summaries, examples, and quizzes when asked
- Build confidence and encourage curiosity

Your communication style:
- Use simple, clear language appropriate for students
- Be supportive and motivating - celebrate their efforts and progress
- Never judge, shame, or make the student feel bad for not knowing something
- If a topic is difficult, break it into smaller, manageable steps
- Use emojis occasionally to be friendly 📚✨

Special behaviors for different requests:
- When asked to "explain simply": Break down the concept into the most basic terms with relatable examples
- When asked for a "summary": Create a concise, organized summary with key points
- When asked to "make a quiz": Create exactly 5 multiple-choice questions with 4 options each, then wait for answers before revealing the correct ones
- When helping with "homework": Guide with questions rather than giving direct answers - help them think through the problem

When analyzing images:
- If a student shares an image of a problem, exam question, or homework, analyze it carefully
- Describe what you see and provide helpful explanations
- If it's a math problem, show step-by-step solutions
- If it's text/notes, help summarize or explain the content

Remember: Your goal is to help students truly understand and learn, not just get answers. Be their supportive study buddy! 🎓`;

const EXAM_MODE_ADDITION = `

⚠️ EXAM MODE ACTIVATED ⚠️
The student is in EXAM MODE and needs quick, direct answers for their exam preparation.

In this mode:
- Give DIRECT, CLEAR answers immediately - no lengthy explanations unless asked
- Be concise and to the point
- If they share an image of an exam question, provide the correct answer directly
- Format answers clearly (A, B, C, D if multiple choice)
- If it's a calculation, show the final answer prominently
- Skip the teaching approach - they need answers NOW
- Still be encouraging but prioritize speed and accuracy

Example response format:
"✅ Answer: B) [answer text]

Quick explanation: [1-2 sentence reason]"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
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
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    const { messages, actionType, imageUrl, customSystemPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Add action-specific instructions if needed
    let actionInstruction = "";
    if (actionType === "explain") {
      actionInstruction = "\n\n[The student clicked 'Explain Simply' - provide a very simple, step-by-step explanation with examples.]";
    } else if (actionType === "summary") {
      actionInstruction = "\n\n[The student clicked 'Create Summary' - provide a clear, organized summary with bullet points.]";
    } else if (actionType === "quiz") {
      actionInstruction = "\n\n[The student clicked 'Make Quiz' - create exactly 5 multiple-choice questions about the topic with 4 options each (A, B, C, D). Format them clearly and wait for the student to answer before revealing correct answers.]";
    } else if (actionType === "homework") {
      actionInstruction = "\n\n[The student clicked 'Help with Homework' - guide them through the problem step by step, asking questions to help them think rather than giving direct answers.]";
    } else if (actionType === "exam") {
      actionInstruction = EXAM_MODE_ADDITION;
    }

    // Build system message with optional custom instructions
    let fullSystemPrompt = SYSTEM_PROMPT + actionInstruction;
    if (customSystemPrompt && customSystemPrompt.trim()) {
      fullSystemPrompt += `\n\n[DODATNE INSTRUKCIJE OD KORISNIKA]: ${customSystemPrompt.trim()}`;
    }
    
    const systemMessage = {
      role: "system",
      content: fullSystemPrompt,
    };

    // Process messages to handle images
    const processedMessages = messages.map((msg: { role: string; content: string; imageUrl?: string }) => {
      if (msg.imageUrl) {
        // Multimodal message with image
        return {
          role: msg.role,
          content: [
            {
              type: "text",
              text: msg.content || "Please analyze this image and help me understand it.",
            },
            {
              type: "image_url",
              image_url: {
                url: msg.imageUrl,
              },
            },
          ],
        };
      }
      return msg;
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [systemMessage, ...processedMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests! Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Sorry, I had trouble thinking. Please try again!" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
