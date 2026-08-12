import { Router } from "express";
import pool from "../config/db.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

/**
 * POST /api/meetings/:id/speakers
 * Update custom speaker name mapping for a meeting (e.g., {"Speaker 1": "John", "Speaker 2": "Sarah"})
 */
router.post("/:id/speakers", requireAuth, async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.session.user.id;
    const { speakerMap } = req.body;

    if (!speakerMap || typeof speakerMap !== "object") {
      return res.status(400).json({ error: "Invalid speaker mapping data." });
    }

    // Verify ownership
    const [rows] = await pool.query(
      "SELECT id, speaker_map FROM meetings WHERE id = ? AND user_id = ?",
      [meetingId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    await pool.query(
      "UPDATE meetings SET speaker_map = ? WHERE id = ?",
      [JSON.stringify(speakerMap), meetingId]
    );

    res.json({ success: true, speakerMap });
  } catch (err) {
    console.error("Failed to update speaker mapping:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/meetings/:id/schedules
 * Fetch extracted schedule events for a specific meeting
 */
router.get("/:id/schedules", requireAuth, async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.session.user.id;

    // Verify ownership
    const [rows] = await pool.query(
      "SELECT id FROM meetings WHERE id = ? AND user_id = ?",
      [meetingId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const [schedules] = await pool.query(
      "SELECT * FROM meeting_schedules WHERE meeting_id = ? ORDER BY event_date ASC",
      [meetingId]
    );

    res.json({ schedules });
  } catch (err) {
    console.error("Failed to fetch schedules:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/schedules/upcoming
 * Fetch all upcoming schedules across user meetings for future meeting context & timeline
 */
router.get("/upcoming", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [schedules] = await pool.query(
      `SELECT s.*, m.title as meeting_title, m.created_at as meeting_created_at
       FROM meeting_schedules s
       JOIN meetings m ON s.meeting_id = m.id
       WHERE m.user_id = ?
       ORDER BY s.event_date ASC`,
      [userId]
    );

    res.json({ schedules });
  } catch (err) {
    console.error("Failed to fetch upcoming schedules:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
