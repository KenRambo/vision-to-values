import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchWebsiteText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const text = [
      $("meta[name='description']").attr("content") || "",
      $("h1").text(),
      $("h2").text(),
      $("h3").text(),
      $("p").text(),
    ]
      .join("\n\n")
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, 6000);
  } catch (err) {
    console.error("Failed to fetch site:", err);
    return "";
  }
}

function tryParseJsonSections(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to parse GPT JSON:", err);
  }
  return {};
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const websiteText = await fetchWebsiteText(url);

    if (!websiteText || websiteText.length < 100) {
      return NextResponse.json({
        sections: {
          vision: "TBD",
          mission: "TBD",
          strategy: "TBD",
          objectives: "TBD",
          priorities: "TBD",
          culture: "TBD",
          values: "TBD",
        },
      });
    }

    const systemPrompt = `
You're an expert company strategist.

Based on the company website content below, generate a strawman Vision to Values document as a JSON object with the following keys:
- vision
- mission
- strategy
- objectives
- priorities
- culture
- values

If any of these are not clearly inferable, return "TBD" for that field.

Respond ONLY with the JSON object.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: websiteText },
      ],
    });

    const reply = completion.choices[0]?.message?.content || "";
    const parsed = tryParseJsonSections(reply);

    return NextResponse.json({
      sections: parsed || {
        vision: "TBD",
        mission: "TBD",
        strategy: "TBD",
        objectives: "TBD",
        priorities: "TBD",
        culture: "TBD",
        values: "TBD",
      },
    });
  } catch (err) {
    console.error("Error in /generate-from-website:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
