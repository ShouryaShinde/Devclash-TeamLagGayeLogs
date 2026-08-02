import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Format seconds into [MM:SS]
 */
export function formatTimestamp(seconds) {
  const totalSeconds = Math.floor(seconds || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Transcribe audio file with Speaker Diarization using Deepgram API
 *
 * @param {string} audioPath - Path to local audio file
 * @returns {Promise<{ text: string, segments: Array<{ speakerId: string, speakerName: string, timestamp: string, start: number, end: number, text: string }> }>}
 */
export async function transcribeWithDeepgram(audioPath) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey || apiKey === "your_deepgram_api_key_here") {
    throw new Error("DEEPGRAM_API_KEY is not configured.");
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found at ${audioPath}`);
  }

  console.log(`🎤 Sending audio to Deepgram Diarization API...`);
  const audioBuffer = fs.readFileSync(audioPath);

  // Determine content type based on extension
  const ext = path.extname(audioPath).toLowerCase();
  let contentType = "audio/wav";
  if (ext === ".mp3") contentType = "audio/mp3";
  else if (ext === ".m4a") contentType = "audio/m4a";
  else if (ext === ".mp4") contentType = "video/mp4";
  else if (ext === ".webm") contentType = "audio/webm";
  else if (ext === ".ogg") contentType = "audio/ogg";

  const response = await axios.post(
    "https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&smart_format=true&utterances=true&punctuate=true",
    audioBuffer,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": contentType,
      },
      timeout: 300000, // 5 min timeout
    }
  );

  const data = response.data;
  const utterances = data?.results?.utterances || [];

  if (!utterances || utterances.length === 0) {
    // Fallback if utterances list is empty, check words
    const alternative = data?.results?.channels?.[0]?.alternatives?.[0];
    const fullText = alternative?.transcript || "";
    const words = alternative?.words || [];

    if (words.length > 0) {
      return groupWordsToSegments(words);
    }

    return {
      text: fullText || "No speech detected in audio.",
      segments: [
        {
          speakerId: "Speaker 1",
          speakerName: "Speaker 1",
          timestamp: "00:00",
          start: 0,
          end: 0,
          text: fullText || "No speech detected.",
        },
      ],
    };
  }

  // Process Deepgram Utterances
  const rawSegments = [];
  for (const utt of utterances) {
    const speakerNum = (utt.speaker !== undefined ? utt.speaker : 0) + 1; // 1-indexed speaker
    const speakerId = `Speaker ${speakerNum}`;
    const timestampStr = formatTimestamp(utt.start);

    rawSegments.push({
      speakerId,
      speakerName: speakerId,
      timestamp: timestampStr,
      start: utt.start,
      end: utt.end,
      text: utt.transcript.trim(),
    });
  }

  // Merge consecutive utterances from the same speaker if close in time
  const mergedSegments = [];
  for (const seg of rawSegments) {
    if (mergedSegments.length === 0) {
      mergedSegments.push({ ...seg });
    } else {
      const prev = mergedSegments[mergedSegments.length - 1];
      if (prev.speakerId === seg.speakerId && seg.start - prev.end <= 3.0) {
        prev.end = seg.end;
        prev.text += " " + seg.text;
      } else {
        mergedSegments.push({ ...seg });
      }
    }
  }

  // Build plain text speaker transcript
  const textBlocks = mergedSegments.map((s) => {
    return `${s.speakerName}:\n[${s.timestamp}]\n${s.text}`;
  });
  const formattedText = textBlocks.join("\n\n");

  return {
    text: formattedText,
    segments: mergedSegments,
  };
}

/**
 * Helper to group individual word array from Deepgram by speaker
 */
function groupWordsToSegments(words) {
  const segments = [];
  let currentSeg = null;

  for (const word of words) {
    const speakerNum = (word.speaker !== undefined ? word.speaker : 0) + 1;
    const speakerId = `Speaker ${speakerNum}`;

    if (!currentSeg || currentSeg.speakerId !== speakerId) {
      if (currentSeg) segments.push(currentSeg);
      currentSeg = {
        speakerId,
        speakerName: speakerId,
        timestamp: formatTimestamp(word.start),
        start: word.start,
        end: word.end,
        text: word.punctuated_word || word.word,
      };
    } else {
      currentSeg.end = word.end;
      currentSeg.text += " " + (word.punctuated_word || word.word);
    }
  }

  if (currentSeg) segments.push(currentSeg);

  const formattedText = segments
    .map((s) => `${s.speakerName}:\n[${s.timestamp}]\n${s.text}`)
    .join("\n\n");

  return {
    text: formattedText,
    segments,
  };
}
