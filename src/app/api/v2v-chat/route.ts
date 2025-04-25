import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SECTIONS = [
  "vision",
  "mission",
  "strategy",
  "objectives",
  "priorities",
  "culture",
  "values",
];

export async function POST(req: NextRequest) {
  try {
    const { messages, context = {} } = await req.json();

    const userMessage =
      messages.filter((m: any) => m.role === "user").slice(-1)[0]?.content ||
      "";

    // Step 1: Classify the user's intent
    const classifierPrompt = `
You're a classification engine for a Vision to Values builder.

Classify the user's message into one of these categories:
- vision
- mission
- strategy
- objectives
- priorities
- culture
- values

User message:
"${userMessage}"

Respond ONLY with the category name. No explanation.
`;

    const classificationRes = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0,
      messages: [{ role: "system", content: classifierPrompt }],
    });

    const section = classificationRes.choices[0]?.message?.content
      ?.toLowerCase()
      ?.trim();

    if (!section || !SECTIONS.includes(section)) {
      return NextResponse.json({
        error: "Could not determine which section to work on.",
        reply:
          "Hmm, I couldn’t quite tell which section that message applies to. Could you clarify?",
      });
    }

    // Step 2: Generate coaching message for that section
    const currentDraft = context[section] || "No draft provided yet.";
    const formattedContext = Object.entries(context)
      .map(
        ([k, v]) =>
          `${k.toUpperCase()}: ${Array.isArray(v) ? v.join("; ") : v}`,
      )
      .join("\n");

    const coachingPrompt = `
You are helping a startup founder refine the "${section}" section of their Vision to Values document.

Here is their current draft for this section:
"${currentDraft}"

You may reference other sections for alignment:
${formattedContext}

Your goal is to:
- Improve clarity, tone, and alignment with their identity
- Ask thoughtful follow-up questions or offer suggestions
- Stay focused on just the "${section}" section for now
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      messages: [{ role: "system", content: coachingPrompt }, ...messages],
    });

    const reply =
      response.choices[0]?.message?.content || "Let’s keep refining this.";
    return NextResponse.json({ reply, section });
  } catch (err) {
    console.error("Error in /api/v2v-chat:", err);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
