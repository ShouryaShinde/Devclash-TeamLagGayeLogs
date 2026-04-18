import { exec } from "child_process";

export function transcribeAudioLocal(audioPath) {
  return new Promise((resolve, reject) => {
    const command = `python scripts/transcribe.py "${audioPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Whisper Error:", error);
        return reject(error);
      }

      try {
        const result = JSON.parse(stdout);
        console.log("📝 Transcript:", result.text);
        resolve(result.text);
      } catch (err) {
        console.error("Parse Error:", stdout);
        reject(err);
      }
    });
  });
}