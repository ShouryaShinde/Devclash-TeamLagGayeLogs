import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Analyze a transcript using OpenAI GPT to return meeting intelligence,
 * key decisions, action items, and intelligent schedule/date extractions with relative date resolution.
 *
 * @param {string} transcript - The raw or diarized transcript text
 * @param {Date|string} meetingDate - Reference meeting date for resolving relative dates
 * @returns {Promise<{
 *   summary: string,
 *   keyDecisions: string[],
 *   actionItems: {task: string, assignee: string, deadline: string}[],
 *   schedules: {event_date: string, formatted_date: string, goal: string, event_type: string, owner: string, raw_mention: string}[]
 * }>}
 */
export async function analyzeTranscript(transcript, meetingDate = new Date()) {
  const refDateObj = new Date(meetingDate);
  const refDateStr = isNaN(refDateObj.getTime())
    ? new Date().toISOString().split("T")[0]
    : refDateObj.toISOString().split("T")[0];

  const refDateFormatted = isNaN(refDateObj.getTime())
    ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : refDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const apiKey = process.env.OPENAI_API_KEY;

  // If no API key, fall back to local basic analysis
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    console.log("⚠️ No OpenAI API key — using local intelligent date extraction.");
    return localAnalysis(transcript, refDateObj);
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a meeting intelligence assistant.
The meeting reference date is: ${refDateStr} (${refDateFormatted}).

Analyze the provided meeting transcript and extract:
1. Executive Summary
2. Key Decisions
3. Action Items
4. Upcoming Schedule & Deadlines (Detect deadlines, meeting dates, review dates, delivery dates, follow-up meetings, milestones, or any calendar commitment).

IMPORTANT: Resolve all relative dates (such as "tomorrow", "next Monday", "next Friday", "in two weeks", "by Friday", "by August 15") into exact resolved dates based on the meeting reference date (${refDateStr}).

Return a JSON object with EXACTLY this structure:
{
  "summary": "A concise 2-3 sentence executive summary of the meeting",
  "keyDecisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    {"task": "Task description", "assignee": "Person name or 'Unassigned'", "deadline": "Deadline description or YYYY-MM-DD"}
  ],
  "schedules": [
    {
      "event_date": "YYYY-MM-DD format (e.g. 2026-08-15)",
      "formatted_date": "Short formatted date (e.g. Aug 15 or Aug 18)",
      "goal": "Clear concise goal title (e.g. Complete Dashboard)",
      "event_type": "deadline | review | demo | meeting | milestone | follow_up",
      "owner": "Person name or 'Unassigned'",
      "raw_mention": "Quote or sentence mentioning this schedule"
    }
  ]
}

Return ONLY valid JSON, no markdown code block wrapper, no explanation.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content.trim();
    // Clean markdown wrappers if present
    const cleanedJson = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      summary: parsed.summary || "No summary generated.",
      keyDecisions: parsed.keyDecisions || [],
      actionItems: parsed.actionItems || [],
      schedules: (parsed.schedules || []).map((s) => ({
        event_date: s.event_date || refDateStr,
        formatted_date: s.formatted_date || s.event_date || "Upcoming",
        goal: s.goal || "Scheduled Item",
        event_type: s.event_type || "deadline",
        owner: s.owner || "Unassigned",
        raw_mention: s.raw_mention || "",
      })),
    };
  } catch (err) {
    console.error("❌ OpenAI analysis failed:", err.message);
    console.log("⚠️ Falling back to local analysis.");
    return localAnalysis(transcript, refDateObj);
  }
}

/**
 * Fallback local analysis: extracts summary, key decisions, action items,
 * and parses relative dates using regex & date math.
 */
function localAnalysis(transcript, refDate = new Date()) {
  if (!transcript || transcript.trim().length === 0) {
    return {
      summary: "No transcript content was detected in this recording.",
      keyDecisions: [],
      actionItems: [],
      schedules: [],
    };
  }

  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
  const summaryText =
    sentences.slice(0, 3).join(" ").trim() ||
    transcript.substring(0, 300) + "...";

  const schedules = extractSchedulesLocally(transcript, refDate);

  const actionItems = schedules.map((s) => ({
    task: s.goal,
    assignee: s.owner,
    deadline: s.formatted_date,
  }));

  if (actionItems.length === 0) {
    actionItems.push({
      task: "Review meeting transcript and assign project responsibilities",
      assignee: "Unassigned",
      deadline: "TBD",
    });
  }

  return {
    summary: summaryText,
    keyDecisions: [
      "Follow up on timeline commitments discussed during the meeting.",
      "Review transcript speaker segments for detailed action items.",
    ],
    actionItems,
    schedules,
  };
}

/**
 * Intelligent local schedule & relative date extractor using regex & date math
 */
function extractSchedulesLocally(text, refDate = new Date()) {
  const schedules = [];
  const lines = text.split("\n");
  const baseTime = refDate.getTime();

  // Common keywords matching schedule commitments
  const scheduleRegex = /(by|on|next|in|until|deadline|review|demo|finish|complete|schedule)\s+([A-Za-z0-9\s,]+)/i;

  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const fullMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  let currentSpeaker = "Unassigned";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      continue; // Skip timestamp line
    }
    if (trimmed.startsWith("Speaker ") || (trimmed.includes(":") && !trimmed.startsWith("http") && trimmed.length < 30)) {
      currentSpeaker = trimmed.split(":")[0].replace(/\[.*?\]/g, "").trim() || "Unassigned";
      continue;
    }

    // Match explicit dates e.g., "August 15", "Aug 15", "15th August"
    const explicitMatch = trimmed.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);
    if (explicitMatch) {
      const monthStr = explicitMatch[1].toLowerCase();
      const dayNum = parseInt(explicitMatch[2], 10);
      let monthIdx = monthNames.indexOf(monthStr.substring(0, 3));
      if (monthIdx === -1) monthIdx = fullMonths.indexOf(monthStr);

      if (monthIdx !== -1 && !isNaN(dayNum)) {
        const targetDate = new Date(refDate.getFullYear(), monthIdx, dayNum);
        // If target date has passed in current year, assume next year
        if (targetDate.getTime() < baseTime - 86400000 * 30) {
          targetDate.setFullYear(refDate.getFullYear() + 1);
        }

        const isoDate = targetDate.toISOString().split("T")[0];
        const formatted = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const goalText = trimmed.length > 80 ? trimmed.substring(0, 77) + "..." : trimmed;

        schedules.push({
          event_date: isoDate,
          formatted_date: formatted,
          goal: goalText,
          event_type: trimmed.toLowerCase().includes("review") ? "review" : trimmed.toLowerCase().includes("demo") ? "demo" : "deadline",
          owner: currentSpeaker,
          raw_mention: trimmed,
        });
        continue;
      }
    }

    // Match relative dates e.g. "tomorrow", "next Monday", "next Friday", "in 2 weeks"
    if (trimmed.match(/tomorrow/i)) {
      const targetDate = new Date(baseTime + 86400000);
      schedules.push({
        event_date: targetDate.toISOString().split("T")[0],
        formatted_date: targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        goal: trimmed.length > 80 ? trimmed.substring(0, 77) + "..." : trimmed,
        event_type: "deadline",
        owner: currentSpeaker,
        raw_mention: trimmed,
      });
    } else if (trimmed.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
      const matchDay = trimmed.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)[1].toLowerCase();
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDayIdx = daysOfWeek.indexOf(matchDay);
      const currentDayIdx = refDate.getDay();
      let distance = (targetDayIdx + 7 - currentDayIdx) % 7;
      if (distance === 0) distance = 7;

      const targetDate = new Date(baseTime + distance * 86400000);
      schedules.push({
        event_date: targetDate.toISOString().split("T")[0],
        formatted_date: targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        goal: trimmed.length > 80 ? trimmed.substring(0, 77) + "..." : trimmed,
        event_type: "review",
        owner: currentSpeaker,
        raw_mention: trimmed,
      });
    }
  }

  return schedules;
}
