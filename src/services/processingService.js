import fs from "fs";
import axios from "axios";
import getAccessToken from "./zoomAuth.js";

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
    console.log(response) ;

    const filePath = `src/uploads/recording_${Date.now()}.mp4`;
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log("✅ Downloaded:", filePath);
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