import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve script path relative to this file (src/services/ → ../../scripts/)
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/transcribe.py");

export function transcribeAudioLocal(audioPath) {
  return new Promise((resolve, reject) => {
    const command = `python "${SCRIPT_PATH}" "${audioPath}"`;

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