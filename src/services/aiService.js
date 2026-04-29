import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Analyze a transcript using OpenAI GPT and return structured meeting intelligence.
 * Falls back to a basic local parse if no API key is configured.
 *
 * @param {string} transcript - The raw transcript text
 * @returns {Promise<{summary: string, keyDecisions: string[], actionItems: {task: string, assignee: string, deadline: string}[]}>}
 */
export async function analyzeTranscript(transcript) {
  const apiKey = process.env.OPENAI_API_KEY;

  // If no API key, fall back to local basic analysis
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    console.log("⚠️  No OpenAI API key — using basic local analysis.");
    return localAnalysis(transcript);
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a meeting intelligence assistant. Analyze the following meeting transcript and return a JSON object with exactly this structure:
{
  "summary": "A concise 2-3 sentence executive summary of the meeting",
  "keyDecisions": ["Decision 1", "Decision 2", ...],
  "actionItems": [
    {"task": "Task description", "assignee": "Person name or 'Unassigned'", "deadline": "Deadline or 'TBD'"},
    ...
  ]
}
Return ONLY valid JSON, no markdown, no explanation.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content.trim();
    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || "No summary generated.",
      keyDecisions: parsed.keyDecisions || [],
      actionItems: parsed.actionItems || [],
    };
  } catch (err) {
    console.error("❌ OpenAI analysis failed:", err.message);
    console.log("⚠️  Falling back to local analysis.");
    return localAnalysis(transcript);
  }
}

/**
 * Basic local analysis fallback — extracts a summary from the first few sentences
 * and returns empty decisions/action items.
 */
function localAnalysis(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    return {
      summary: "No transcript content was detected in this recording.",
      keyDecisions: [],
      actionItems: [],
    };
  }

  // Take first 3 sentences as a rough summary
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
  const summaryText =
    sentences.slice(0, 3).join(" ").trim() ||
    transcript.substring(0, 300) + "...";

  return {
    summary: summaryText,
    keyDecisions: ["Review the full transcript for detailed decisions."],
    actionItems: [
      {
        task: "Review meeting transcript and identify action items",
        assignee: "Unassigned",
        deadline: "TBD",
      },
    ],
  };
}
