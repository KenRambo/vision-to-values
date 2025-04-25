"use client";

import { useState, useEffect, useRef } from "react";
import VisionToValuesPreview from "@/components/VisionToValuesPreview";

const sections = [
  { key: "vision", label: "Vision" },
  { key: "mission", label: "Mission" },
  { key: "strategy", label: "Strategy" },
  { key: "objectives", label: "Objectives" },
  { key: "priorities", label: "Priorities" },
  { key: "culture", label: "Culture" },
  { key: "values", label: "Values" },
];

export default function VisionToValuesForm() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sectionData, setSectionData] = useState<{ [key: string]: any }>({});
  const [lastUpdatedByAI, setLastUpdatedByAI] = useState<string | null>(null);
  const [crawlProgress, setCrawlProgress] = useState(0);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome! Just tell me what you want to work on.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [generatingFromUrl, setGeneratingFromUrl] = useState(false);
  const [showWebsitePanel, setShowWebsitePanel] = useState(true);

  const currentSection = sections[currentIndex];
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const normalizeUrl = (input: string) => {
    if (!/^https?:\/\//i.test(input)) {
      return "https://" + input;
    }
    return input;
  };

  const generateFromWebsite = async (rawUrl: string) => {
    const url = normalizeUrl(rawUrl.trim());
    if (!url) return;
    setGeneratingFromUrl(true);
    setCrawlProgress(0);

    const progressInterval = setInterval(() => {
      setCrawlProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + 5;
      });
    }, 150);

    const res = await fetch("/api/rendered-crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const result = await res.json();
    clearInterval(progressInterval);
    setCrawlProgress(100);

    setTimeout(() => {
      setGeneratingFromUrl(false);
      setCrawlProgress(0);
    }, 600);

    if (result.sections) {
      const updates: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(result.sections)) {
        const current = sectionData[key];
        if (!current || current === "TBD") {
          updates[key] = value;
        }
      }
      setSectionData((prev) => ({ ...prev, ...updates }));
      setMessages([
        {
          role: "assistant",
          content:
            "I've refreshed your Vision to Values draft. Only empty or TBD sections were replaced.",
        },
      ]);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: "user", content: chatInput.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatInput("");
    setLoading(true);

    const res = await fetch(`/api/v2v-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: updatedMessages,
        context: sectionData,
      }),
    });

    const result = await res.json();
    const assistantReply = result.reply;
    const detectedSection = result.section || currentSection.key;
    const newMessages = [
      ...updatedMessages,
      { role: "assistant", content: assistantReply },
    ];
    setMessages(newMessages);

    const detectedIndex = sections.findIndex((s) => s.key === detectedSection);
    if (detectedIndex !== -1) {
      setCurrentIndex(detectedIndex);
    }

    const isComplete = /complete|sounds great|excellent|ready to move on/i.test(
      assistantReply,
    );
    if (isComplete) {
      setSectionData((prev) => ({
        ...prev,
        [detectedSection]: assistantReply.trim(),
      }));
      setLastUpdatedByAI(detectedSection);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto px-6 py-10 font-sans">
      <header>
        <h1 className="text-4xl font-bold text-gray-900 mb-1">
          Vision to Values Generator (Beta)
        </h1>
        <p className="text-gray-600">
          Generate or refine any section — GPT will guide you.
        </p>
      </header>

      {generatingFromUrl && (
        <div className="relative mb-4 h-2 w-full bg-gray-200 rounded overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-150 ease-out"
            style={{ width: `${crawlProgress}%` }}
          />
        </div>
      )}

      <section>
        <button
          type="button"
          onClick={() => setShowWebsitePanel((prev) => !prev)}
          className="text-sm text-indigo-700 font-medium underline"
        >
          {showWebsitePanel
            ? "Hide website helper"
            : "Generate from a website (optional)"}
        </button>

        {showWebsitePanel && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Paste a company website and we’ll generate a first draft:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    generateFromWebsite(websiteUrl);
                  }
                }}
                placeholder="e.g. patrickhillstrom.com"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
              />
              {websiteUrl && !generatingFromUrl && (
                <button
                  onClick={() => generateFromWebsite(websiteUrl)}
                  className="text-sm text-gray-600 underline hover:text-indigo-600 transition"
                >
                  🔄 Recrawl this site and regenerate (TBD only)
                </button>
              )}
              <button
                onClick={() => generateFromWebsite(websiteUrl)}
                className="bg-indigo-600 text-white px-4 py-2 text-sm rounded hover:bg-indigo-700 transition"
                disabled={generatingFromUrl}
              >
                {generatingFromUrl ? "Generating…" : "Generate"}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Press <kbd>Enter</kbd> or click Generate to analyze the site.
            </p>
          </div>
        )}
      </section>

      <VisionToValuesPreview
        data={sectionData}
        onUpdate={(key, value) =>
          setSectionData((prev) => ({ ...prev, [key]: value }))
        }
        lastUpdatedByAI={lastUpdatedByAI}
      />

      <section className="bg-white border border-gray-200 rounded p-5 shadow h-[40vh] overflow-y-auto space-y-4 text-sm">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-md ${
              msg.role === "assistant"
                ? "bg-blue-50 text-blue-900"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <strong className="block mb-1">
              {msg.role === "assistant" ? "AI" : "You"}:
            </strong>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </section>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="What would you like to refine?"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
              }
            }}
          />
          <button
            onClick={handleChatSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
