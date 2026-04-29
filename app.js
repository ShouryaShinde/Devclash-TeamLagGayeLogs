import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import zoomRoutes from "./src/routes/zoomRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import { initDatabase } from "./src/config/db.js";
import pool from "./src/config/db.js";
import { requireAuth, guestOnly } from "./src/middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the same directory as this file (project root)
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─── Session Configuration ───────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "briefly-fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
    },
  })
);

// ─── Make session user available in all EJS templates ────────
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ─── API & Auth Routes ───────────────────────────────────────
app.use("/api/zoom", zoomRoutes);
app.use("/auth", authRoutes);
app.use("/upload-process", requireAuth, uploadRoutes);

// ─── Public Pages ────────────────────────────────────────────
app.get("/", (req, res) => res.render("home"));
app.get("/working", (req, res) => res.render("working"));

// ─── Protected: Uploads Page ─────────────────────────────────
app.get("/uploads", requireAuth, (req, res) => {
  res.render("uploads", { error: req.query.error || null });
});

// ─── Protected: Dashboard (list all user meetings) ──────────
app.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [meetings] = await pool.query(
      "SELECT id, title, file_name, status, created_at FROM meetings WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    // If there are meetings, show the most recent one by default
    if (meetings.length > 0) {
      return res.redirect(`/dashboard/${meetings[0].id}`);
    }
    // No meetings — show empty state
    res.render("dashboard", { meetings, meeting: null });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", { meetings: [], meeting: null });
  }
});

// ─── Protected: Dashboard (single meeting detail) ───────────
app.get("/dashboard/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const meetingId = req.params.id;

    // Get all meetings for sidebar
    const [meetings] = await pool.query(
      "SELECT id, title, file_name, status, created_at FROM meetings WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    // Get the selected meeting
    const [rows] = await pool.query(
      "SELECT * FROM meetings WHERE id = ? AND user_id = ?",
      [meetingId, userId]
    );

    if (rows.length === 0) {
      return res.redirect("/dashboard");
    }

    const meeting = rows[0];

    // Parse JSON fields safely
    try {
      meeting.key_decisions = typeof meeting.key_decisions === "string"
        ? JSON.parse(meeting.key_decisions)
        : meeting.key_decisions || [];
    } catch { meeting.key_decisions = []; }

    try {
      meeting.action_items = typeof meeting.action_items === "string"
        ? JSON.parse(meeting.action_items)
        : meeting.action_items || [];
    } catch { meeting.action_items = []; }

    res.render("dashboard", { meetings, meeting });
  } catch (err) {
    console.error("Meeting detail error:", err);
    res.redirect("/dashboard");
  }
});

// ─── API: Check meeting status (for auto-refresh) ───────────
app.get("/api/meeting-status/:id", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT status FROM meetings WHERE id = ? AND user_id = ?",
      [req.params.id, req.session.user.id]
    );
    if (rows.length === 0) return res.json({ status: "not_found" });
    res.json({ status: rows[0].status });
  } catch (err) {
    res.json({ status: "error" });
  }
});

// ─── Guest-only routes ───────────────────────────────────────
app.get("/login", guestOnly, (req, res) => res.render("login", { error: null }));
app.get("/register", guestOnly, (req, res) => res.render("register", { error: null, name: "", email: "" }));

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("error", {
    title: "404",
    message: "Page Not Found"
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.message);
    res.status(err.status || 500).send("500 - Internal Server Error. Check the terminal for details.");
});

// ─── Start Server ────────────────────────────────────────────
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();