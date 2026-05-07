import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve script path relative to this file (src/services/ → ../../scripts/)
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/transcribe.py");

/**
 * Find the Python executable — checks PATH first, then common Windows locations.
 */
function findPython() {
  // Try common commands
  for (const cmd of ["python", "python3", "py"]) {
    try {
      const result = execSync(`${cmd} -c "import sys; print(sys.executable)"`, {
        timeout: 10000,
        encoding: "utf-8",
        windowsHide: true,
      }).trim();
      if (result && fs.existsSync(result)) {
        console.log(`🐍 Found Python: ${result}`);
        return result;
      }
    } catch {
      // continue to next
    }
  }

  // Check common Windows install locations
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [
    path.join(home, "AppData", "Local", "Programs", "Python", "Python314", "python.exe"),
    path.join(home, "AppData", "Local", "Programs", "Python", "Python313", "python.exe"),
    path.join(home, "AppData", "Local", "Programs", "Python", "Python312", "python.exe"),
    path.join(home, "AppData", "Local", "Programs", "Python", "Python311", "python.exe"),
    path.join(home, "AppData", "Local", "Python", "pythoncore-3.14-64", "python.exe"),
    path.join(home, "AppData", "Local", "Python", "pythoncore-3.13-64", "python.exe"),
    "C:\\Python314\\python.exe",
    "C:\\Python313\\python.exe",
    "C:\\Python312\\python.exe",
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`🐍 Found Python at: ${p}`);
      return p;
    }
  }

  throw new Error("Python not found. Please install Python and ensure it is in PATH.");
}

// Cache the Python path at startup
const PYTHON_PATH = findPython();

export function transcribeAudioLocal(audioPath) {
  return new Promise((resolve, reject) => {
    const command = `"${PYTHON_PATH}" "${SCRIPT_PATH}" "${audioPath}"`;

    console.log(`🎤 Running: ${command}`);

    exec(command, { timeout: 600000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Whisper Error:", error.message);
        if (stderr) console.error("stderr:", stderr);
        return reject(error);
      }

      try {
        const result = JSON.parse(stdout);
        console.log("📝 Transcript:", result.text?.substring(0, 200) + "...");
        resolve(result.text);
      } catch (err) {
        console.error("Parse Error:", stdout);
        reject(err);
      }
    });
  });
}