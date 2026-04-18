import { exec } from "child_process";

export function convertToAudio(videoPath) {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(".mp4", ".wav");
    const command = `ffmpeg -i "${videoPath}" -ar 16000 -ac 1 "${audioPath}"`;
    exec(command, (error) => {
      if (error) {
        console.error("FFmpeg Error:", error);
        return reject(error);
      }
      console.log("🎤 Audio extracted:", audioPath);
      resolve(audioPath);
    });
  });
}