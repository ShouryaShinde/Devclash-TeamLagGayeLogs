import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";
import { convertToAudio } from "../utils/ffmpeg.js";
import { transcribeAudioLocal } from "../services/transcriptionService.js";
import { analyzeTranscript } from "../services/aiService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// ─── Multer config ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `meeting_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mp3|wav|m4a|webm|ogg|mpeg|audio|video/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Only audio/video files are allowed."));
    }
  },
});

// ─── POST /upload-process ────────────────────────────────────
router.post("/", upload.single("meetingFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/uploads?error=No file selected");
    }

    const userId = req.session.user.id;
    const title = req.body.meetingTitle?.trim() || req.file.originalname;
    const fileName = req.file.originalname;
    const filePath = req.file.path;

    // Create meeting record with 'processing' status
    const [result] = await pool.query(
      "INSERT INTO meetings (user_id, title, file_name, file_path, status) VALUES (?, ?, ?, ?, 'processing')",
      [userId, title, fileName, filePath]
    );

    const meetingId = result.insertId;
    console.log(`📁 Meeting #${meetingId} created — processing "${fileName}"...`);

    // Redirect immediately — processing happens in background
    res.redirect(`/dashboard/${meetingId}`);

    // ─── Background processing pipeline ──────────────────────
    processFile(meetingId, filePath, fileName).catch((err) => {
      console.error(`❌ Pipeline failed for meeting #${meetingId}:`, err.message);
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.redirect("/uploads?error=Upload failed. Please try again.");
  }
});

/**
 * Background processing: convert → transcribe → AI analyze → save to DB
 */
async function processFile(meetingId, filePath, fileName) {
  try {
    let audioPath = filePath;

    // If video, extract audio first
    const ext = path.extname(fileName).toLowerCase();
    if ([".mp4", ".webm", ".mkv", ".avi", ".mov"].includes(ext)) {
      console.log(`🎬 Extracting audio from video...`);
      audioPath = await convertToAudio(filePath);
    }

    // Transcribe with Whisper
    console.log(`🎤 Transcribing audio...`);
    const transcript = await transcribeAudioLocal(audioPath);

    if (!transcript) {
      await pool.query(
        "UPDATE meetings SET status = 'failed', summary = ? WHERE id = ?",
        ["Transcription returned empty results.", meetingId]
      );
      return;
    }

    // AI analysis
    console.log(`🧠 Analyzing transcript with AI...`);
    const analysis = await analyzeTranscript(transcript);

    // Save results to DB
    await pool.query(
      `UPDATE meetings 
       SET transcript = ?, summary = ?, key_decisions = ?, action_items = ?, status = 'completed' 
       WHERE id = ?`,
      [
        transcript,
        analysis.summary,
        JSON.stringify(analysis.keyDecisions),
        JSON.stringify(analysis.actionItems),
        meetingId,
      ]
    );

    console.log(`✅ Meeting #${meetingId} processing complete!`);
  } catch (err) {
    console.error(`❌ Processing error for meeting #${meetingId}:`, err.message);
    await pool.query(
      "UPDATE meetings SET status = 'failed', summary = ? WHERE id = ?",
      [`Processing failed: ${err.message}`, meetingId]
    );
  }
}

export default router;
