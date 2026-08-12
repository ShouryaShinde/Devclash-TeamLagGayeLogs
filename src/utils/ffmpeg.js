import { exec } from "child_process";

export function convertToAudio(videoPath) {
  return new Promise((resolve) => {
    // Replace video extension with .wav
    const audioPath = videoPath.replace(/\.[^.]+$/, ".wav");
    const command = `ffmpeg -i "${videoPath}" -ar 16000 -ac 1 -y "${audioPath}"`;

    console.log(`🔊 Converting to audio: ${command}`);

    exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn("⚠️ FFmpeg conversion failed/unavailable. Using original file directly:", error.message);
        return resolve(videoPath);
      }
      console.log("🎤 Audio extracted:", audioPath);
      resolve(audioPath);
    });
  });
}