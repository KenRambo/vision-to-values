import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.json();

    const sections = [
      { key: "vision", label: "Vision" },
      { key: "mission", label: "Mission" },
      { key: "strategy", label: "Strategy" },
      { key: "objectives", label: "Objectives" },
      { key: "priorities", label: "Priorities" },
      { key: "culture", label: "Culture" },
      { key: "values", label: "Values" },
    ];

    const summary = sections
      .filter(({ key }) => formData[key]?.trim())
      .map(({ key, label }) => `### ${label}\n\n${formData[key].trim()}`)
      .join("\n\n");

    const prompt = `You are a strategic communications expert helping a startup founder craft a polished "Vision to Values" page.

Use the following rough inputs provided by the founder. Rephrase and polish each section clearly and concisely, keeping it engaging and authentic.

${summary}

Return a clean HTML document using <h2> for section titles and <p> for body content. No code blocks, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      completion.choices[0]?.message?.content || "<p>No content generated.</p>";
    return NextResponse.json({ content });
  } catch (err) {
    console.error("Error generating Vision to Values page:", err);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 },
    );
  }
}
