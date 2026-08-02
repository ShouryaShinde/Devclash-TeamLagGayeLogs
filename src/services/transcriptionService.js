import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { transcribeWithDeepgram, formatTimestamp } from "./deepgramService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/transcribe.py");

/**
 * Find the Python executable — checks PATH first, then common Windows locations.
 */
function findPython() {
  for (const cmd of ["python", "python3", "py"]) {
    try {
      const result = execSync(`${cmd} -c "import sys; print(sys.executable)"`, {
        timeout: 10000,
        encoding: "utf-8",
        windowsHide: true,
      }).trim();
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch {
      // continue
    }
  }

  const home = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [
    path.join(home, "AppData", "Local", "Programs", "Python", "Python314", "python.exe"),
    path.join(home, "AppData", "Local", "Programs", "Python", "Python313", "python.exe"),
    path.join(home, "AppData", "Local", "Programs", "Python", "Python312", "python.exe"),
    path.join(home, "AppData", "Local", "Programs", "Python", "Python311", "python.exe"),
    "C:\\Python314\\python.exe",
    "C:\\Python313\\python.exe",
    "C:\\Python312\\python.exe",
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return "python"; // Default string fallback
}

let PYTHON_PATH;
try {
  PYTHON_PATH = findPython();
} catch (e) {
  PYTHON_PATH = "python";
}

/**
 * Main transcription entry point supporting Deepgram Speaker Diarization
 * with fallback to local Python Whisper.
 *
 * @param {string} audioPath
 * @returns {Promise<{ text: string, segments: Array<{ speakerId: string, speakerName: string, timestamp: string, start: number, end: number, text: string }> }>}
 */
export async function transcribeAndDiarizeAudio(audioPath) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (apiKey && apiKey !== "your_deepgram_api_key_here") {
    try {
      console.log("⚡ Using Deepgram for Speaker Diarization...");
      const result = await transcribeWithDeepgram(audioPath);
      return result;
    } catch (err) {
      console.error("⚠️ Deepgram Diarization failed:", err.message);
      console.log("🔄 Falling back to local Whisper transcription...");
    }
  } else {
    console.log("ℹ️ No DEEPGRAM_API_KEY found — using local Whisper transcription fallback.");
  }

  // Fallback to local Whisper
  const rawText = await transcribeAudioLocal(audioPath);
  return formatRawTextToSegments(rawText);
}

/**
 * Legacy/Local Whisper Runner
 */
export function transcribeAudioLocal(audioPath) {
  return new Promise((resolve, reject) => {
    const command = `"${PYTHON_PATH}" "${SCRIPT_PATH}" "${audioPath}"`;
    console.log(`🎤 Running Local Whisper: ${command}`);

    exec(command, { timeout: 600000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Whisper Error:", error.message);
        if (stderr) console.error("stderr:", stderr);
        return reject(error);
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result.text || "");
      } catch (err) {
        console.error("Parse Error:", stdout);
        reject(err);
      }
    });
  });
}

/**
 * Helper to split plain un-diarized text into speaker-like dialogue blocks
 * (Used as graceful fallback when Deepgram key is absent or offline)
 */
function formatRawTextToSegments(rawText) {
  if (!rawText || !rawText.trim()) {
    return {
      text: "No transcript content detected.",
      segments: [],
    };
  }

  // Split text by sentences
  const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
  const segments = [];
  let currentSpeaker = 1;
  let accumulated = [];
  let estimatedTime = 0;

  for (let i = 0; i < sentences.length; i++) {
    accumulated.push(sentences[i].trim());

    // Group 2-3 sentences into a speaker block
    if (accumulated.length >= 2 || i === sentences.length - 1) {
      const text = accumulated.join(" ");
      const timestamp = formatTimestamp(estimatedTime);
      const speakerId = `Speaker ${currentSpeaker}`;

      segments.push({
        speakerId,
        speakerName: speakerId,
        timestamp,
        start: estimatedTime,
        end: estimatedTime + 15,
        text,
      });

      // Advance estimated time and alternate speaker
      estimatedTime += 15;
      currentSpeaker = (currentSpeaker % 3) + 1; // Cycle Speaker 1, 2, 3
      accumulated = [];
    }
  }

  const formattedText = segments
    .map((s) => `${s.speakerName}:\n[${s.timestamp}]\n${s.text}`)
    .join("\n\n");

  return {
    text: formattedText,
    segments,
  };
}