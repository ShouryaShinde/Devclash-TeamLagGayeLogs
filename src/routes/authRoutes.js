import { Router } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const router = Router();

// ─── REGISTER ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // Basic validation
  if (!name || !email || !password || !confirmPassword) {
    return res.render("register", {
      error: "All fields are required.",
      name,
      email,
    });
  }

  if (password.length < 6) {
    return res.render("register", {
      error: "Password must be at least 6 characters.",
      name,
      email,
    });
  }

  if (password !== confirmPassword) {
    return res.render("register", {
      error: "Passwords do not match.",
      name,
      email,
    });
  }

  try {
    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.render("register", {
        error: "An account with this email already exists.",
        name,
        email,
      });
    }

    // Hash password and insert
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    // Create session
    req.session.user = {
      id: result.insertId,
      name,
      email,
    };

    res.redirect("/uploads");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", {
      error: "Something went wrong. Please try again.",
      name,
      email,
    });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("login", {
      error: "Email and password are required.",
    });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.render("login", {
        error: "Invalid email or password.",
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        error: "Invalid email or password.",
      });
    }

    // Create session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    res.redirect("/uploads");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", {
      error: "Something went wrong. Please try again.",
    });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────────
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.redirect("/");
  });
});

export default router;
