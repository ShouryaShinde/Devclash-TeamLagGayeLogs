import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer"; // 🔥 NEW
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

app.use("/api/zoom", zoomRoutes);

app.get("/", (req, res) => res.render("home"));
app.get("/dashboard", (req, res) => res.render("dashboard", { notes: null })); // 🔥 pass notes
app.get("/working", (req, res) => res.render("working"));
app.get("/login", (req, res) => res.render("login"));
app.get("/uploads", (req, res) => res.render("uploads"));

app.post("/upload-process", upload.single("meetingFile"), async (req, res) => {
  try {
    console.log("📂 File uploaded:", req.file?.filename);

    const notes = {
      summary:
        "The session focused on guiding users on how to effectively use Zoom features such as polling, meeting creation, and participant engagement. Beginners were encouraged to practice meetings, while experienced users explored automation features like polls.",
      key_concepts: [
        "Zoom polling system",
        "Meeting setup and hosting",
        "Participant engagement",
        "Practice meetings before real sessions",
        "Automating voting using polls",
      ],
    };

    res.render("dashboard", { notes });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).send("Upload failed");
  }
});

app.use((req, res) => {
  res.status(404).render("error", {
    title: "404",
    message: "Page Not Found",
  });
});

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  res.status(err.status || 500).send("500 - Internal Server Error");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});