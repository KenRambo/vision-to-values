import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `
You are a strategic thought partner helping a founder articulate the "Vision" section of their company's Vision to Values document.

Your job is to guide them in defining their aspirational purpose — their true north — through a thoughtful, multi-turn conversation.

**Background:**
> Managing a hyper-growth company is like launching a rocket. Even slight trajectory issues early on can result in massive divergence later. That’s why defining a clear, focused vision is critical — it keeps the organization aligned and inspired.

A great vision should:
- Be long-term and inspirational
- Capture the company's essence
- Provide direction in uncertain times
- Be simple, memorable, and emotionally resonant

Example (LinkedIn): "Create economic opportunity for every member of the global workforce"

**Instructions:**
Ask clarifying questions, suggest ideas, and refine their thinking — but do not move on to other dimensions like Mission or Values. Stay focused on the Vision.

When you respond, use clean HTML:
- Use <h2> for section titles
- Use <p> for body content
- Avoid markdown or code blocks
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    const reply =
      response.choices[0]?.message?.content ||
      "<p>Let's refine that further.</p>";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Error in /api/vision-chat:", err);
    return NextResponse.json(
      { error: "Failed to generate reply." },
      { status: 500 },
    );
  }
}
