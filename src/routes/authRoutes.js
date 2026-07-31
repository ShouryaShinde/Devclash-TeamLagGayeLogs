import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const router = Router();

// ─── REGISTER ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  const cleanName = name ? name.trim() : "";
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  // Basic validation
  if (!cleanName || !cleanEmail || !password || !confirmPassword) {
    return res.render("register", {
      error: "All fields are required.",
      name: cleanName,
      email: cleanEmail,
    });
  }

  if (password.length < 6) {
    return res.render("register", {
      error: "Password must be at least 6 characters.",
      name: cleanName,
      email: cleanEmail,
    });
  }

  if (password !== confirmPassword) {
    return res.render("register", {
      error: "Passwords do not match.",
      name: cleanName,
      email: cleanEmail,
    });
  }

  try {
    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.render("register", {
        error: "An account with this email already exists.",
        name: cleanName,
        email: cleanEmail,
      });
    }

    // Hash password and insert
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [cleanName, cleanEmail, hashedPassword]
    );

    // Create session
    req.session.user = {
      id: result.insertId,
      name: cleanName,
      email: cleanEmail,
    };

    console.log(`👤 New user registered: ${cleanEmail} (ID: ${result.insertId})`);
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", {
      error: "Something went wrong. Please try again.",
      name: cleanName,
      email: cleanEmail,
    });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  if (!cleanEmail || !password) {
    return res.render("login", {
      error: "Email and password are required.",
      email: cleanEmail,
    });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (rows.length === 0) {
      return res.render("login", {
        error: "Invalid email or password.",
        email: cleanEmail,
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        error: "Invalid email or password.",
        email: cleanEmail,
      });
    }

    // Create session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    console.log(`🔑 User logged in: ${user.email} (ID: ${user.id})`);
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", {
      error: "Something went wrong. Please try again.",
      email: cleanEmail,
    });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────────
router.get("/logout", (req, res) => {
  const userEmail = req.session.user?.email;
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    if (userEmail) console.log(`👋 User logged out: ${userEmail}`);
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

export default router;
