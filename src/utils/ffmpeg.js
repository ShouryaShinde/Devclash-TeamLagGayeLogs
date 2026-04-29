import { exec } from "child_process";

export function convertToAudio(videoPath) {
  return new Promise((resolve, reject) => {
    // Replace video extension with .wav
    const audioPath = videoPath.replace(/\.[^.]+$/, ".wav");
    const command = `ffmpeg -i "${videoPath}" -ar 16000 -ac 1 -y "${audioPath}"`;

    console.log(`🔊 Converting to audio: ${command}`);

    exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg Error:", error.message);
        return reject(error);
      }
      console.log("🎤 Audio extracted:", audioPath);
      resolve(audioPath);
    });
  });
}