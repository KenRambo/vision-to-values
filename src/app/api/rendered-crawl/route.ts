import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractVisibleTextFromPage(url: string): Promise<string> {
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);
    await page.waitForSelector("h1, p, main, body", { timeout: 5000 });

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await page.waitForTimeout(1000);

    const text = await page.evaluate(() => {
      const getVisibleText = (el: Element) => {
        const style = window.getComputedStyle(el as HTMLElement);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
        );
      };

      return Array.from(document.querySelectorAll("h1, h2, h3, p, li"))
        .filter((el) => getVisibleText(el))
        .map((el) => el.textContent?.trim())
        .filter((t) => t && t.length > 20)
        .join("\n\n");
    });

    await browser.close();
    return text.slice(0, 8000);
  } catch (err) {
    console.error("⚠️ Failed to load or extract from page:", err);
    await browser.close();
    return "";
  }
}

function tryParseJsonSections(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn("⚠️ Failed to parse GPT response as JSON:", err);
  }
  return {};
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!/^https?:\/\/.+\..+/.test(url)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const siteText = await extractVisibleTextFromPage(url);
    console.log("📄 Crawled content (truncated):\n", siteText.slice(0, 500));

    if (!siteText || siteText.length < 100) {
      return NextResponse.json({
        sections: Object.fromEntries(
          [
            "vision",
            "mission",
            "strategy",
            "objectives",
            "priorities",
            "culture",
            "values",
          ].map((key) => [key, "TBD"]),
        ),
      });
    }

    const prompt = `
You are a company-building strategist.

Based on the content below from a company's website, generate a draft Vision to Values document.

Return the result as a valid JSON object with the following keys:
- vision
- mission
- strategy
- objectives
- priorities
- culture
- values

Use the company's tone where possible. If something is not inferable, write "TBD".
Only output the JSON object — no explanation or intro.
`;

    const gpt = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: siteText },
      ],
    });

    const reply = gpt.choices[0]?.message?.content || "";
    console.log("🤖 GPT raw reply:\n", reply.slice(0, 800));

    const parsed = tryParseJsonSections(reply);

    return NextResponse.json({
      sections:
        parsed ||
        Object.fromEntries(
          [
            "vision",
            "mission",
            "strategy",
            "objectives",
            "priorities",
            "culture",
            "values",
          ].map((key) => [key, "TBD"]),
        ),
    });
  } catch (err) {
    console.error("❌ Error in rendered crawl:", err);
    return NextResponse.json({ error: "Crawl failed" }, { status: 500 });
  }
}
