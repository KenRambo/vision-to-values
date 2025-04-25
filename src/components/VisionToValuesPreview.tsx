import { useState } from "react";

const SECTION_ICONS: Record<string, string> = {
  vision: "💡",
  mission: "🎯",
  strategy: "🧭",
  objectives: "📊",
  priorities: "📌",
  culture: "🤝",
  values: "🌟",
};

export default function VisionToValuesPreview({
  data,
  onUpdate,
  lastUpdatedByAI,
}: {
  data: { [key: string]: any };
  onUpdate: (key: string, value: string | string[] | object[]) => void;
  lastUpdatedByAI: string | null;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const orderedKeys = [
    "vision",
    "mission",
    "strategy",
    "objectives",
    "priorities",
    "culture",
    "values",
  ];

  const handleSave = (key: string) => {
    let value: any = editingText.trim();

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        value = parsed;
      }
    } catch {
      // fallback to string
    }

    onUpdate(key, value);
    setEditingKey(null);
  };

  return (
    <div className="prose max-w-none bg-white border border-gray-200 rounded-lg p-6 shadow space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        📄 Vision to Values Preview
      </h2>

      {orderedKeys.map((key, i) => {
        const raw = data[key];
        if (!raw) return null;

        const icon = SECTION_ICONS[key] || "✏️";
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const isArray = Array.isArray(raw);

        return (
          <section key={key} className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              {icon} {label}
              {lastUpdatedByAI === key && (
                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                  AI updated
                </span>
              )}
            </h3>

            {editingKey === key ? (
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => handleSave(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSave(key);
                  }
                }}
                rows={6}
                autoFocus
                className="w-full border border-gray-300 rounded p-2 text-sm"
              />
            ) : (
              <div
                className="cursor-pointer group space-y-2"
                onClick={() =>
                  setEditingKey(key) &&
                  setEditingText(
                    typeof raw === "string"
                      ? raw
                      : JSON.stringify(raw, null, 2),
                  )
                }
              >
                {isArray ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {raw.map((item: any, idx: number) => (
                      <li key={idx} className="text-gray-700">
                        {typeof item === "string" ? (
                          item
                        ) : (
                          <>
                            {item.label || Object.keys(item).join(", ")}
                            {item.description && (
                              <ul className="list-disc pl-5 text-sm text-gray-500 mt-1">
                                <li>{item.description}</li>
                              </ul>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  // fallback for plain string section
                  String(raw)
                    .split(/\n{2,}/)
                    .map((para, j) => (
                      <p
                        key={j}
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap group-hover:bg-yellow-50"
                      >
                        {para.trim()}
                      </p>
                    ))
                )}
              </div>
            )}

            {i < orderedKeys.length - 1 && (
              <hr className="border-t border-gray-200 my-6" />
            )}
          </section>
        );
      })}
    </div>
  );
}
