import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import zoomRoutes from "./routes/zoomRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use("/api/zoom", zoomRoutes);

app.get("/", (req, res) => res.render("home"));
app.get("/dashboard", (req, res) => res.render("dashboard"));
app.get("/working", (req, res) => res.render("working"));
app.get("/login", (req, res) => res.render("login"));
app.get("/uploads", (req, res) => res.render("uploads"));

app.use((req, res) => {
  res.status(404).render("error", {
    title: "404",
    message: "Page Not Found"
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.message);
    
    // Change this from res.render("error") to res.send()
    res.status(err.status || 500).send("500 - Internal Server Error. Check the terminal for details.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});