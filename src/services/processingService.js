import fs from "fs";
import axios from "axios";
import getAccessToken from "./zoomAuth.js";
import { convertToAudio } from "../utils/ffmpeg.js";
import { transcribeAudioLocal } from "./transcriptionService.js";

export async function processRecording(url) {
  try {
    console.log("📥 Downloading:", url);

    let config = {
      responseType: "stream",
      timeout: 15000,
    };

    // 🔥 ONLY attach token for Zoom URLs
    if (url.includes("zoom.us")) {
      const token = await getAccessToken();

      config.headers = {
        Authorization: `Bearer ${token}`,
      };
    }

    const response = await axios.get(url, config);

    const videoPath = `src/uploads/recording_${Date.now()}.mp4`;
    const writer = fs.createWriteStream(videoPath);

    response.data.pipe(writer);

    writer.on("finish", async () => {
      console.log("✅ Downloaded:", videoPath);

      try {
        const audioPath = await convertToAudio(videoPath);
        console.log("🎧 Ready for transcription:", audioPath);
        // 🔥 STEP 2 (next): call transcription here
        const transcript = await transcribeAudioLocal(audioPath);
      } catch (err) {
        console.error("Processing pipeline error:", err);
      }
    });

    writer.on("error", (err) => {
      console.error("Write Error:", err);
    });

  } catch (err) {
    console.error(
      "Processing Error:",
      err.response?.status,
      err.message
    );
  }
}