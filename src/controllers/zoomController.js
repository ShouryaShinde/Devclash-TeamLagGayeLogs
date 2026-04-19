import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv" ;
import getAccessToken from "../services/zoomAuth.js";
import { processRecording } from "../services/processingService.js";

dotenv.config() ;

/**
 * 🔹 Test Zoom Token
 */
export async function testToken(req, res) {
  try {
    const token = await getAccessToken();
    res.json({ token });
  } catch (err) {
    console.error("Token Error:", err.response?.data || err.message);
    res.status(500).send("Error generating token");
  }
}

/**
 * 🔹 Get Zoom Users (to fetch userId)
 */
export async function getUsers(req, res) {
  try {
    const token = await getAccessToken();

    const response = await axios.get(
      "https://api.zoom.us/v2/users",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("FULL ERROR:", err.response?.data);  // 👈 ADD THIS
    res.status(500).send(err.response?.data);          // 👈 SHOW IT
  }
}

export async function getRecordings(req, res) {
  try {
    const token = await getAccessToken();
    const userId = process.env.USER_ID;
    const response = await axios.get(
      `https://api.zoom.us/v2/users/${userId}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error("Recordings Error:", err.response?.data || err.message);
    res.status(500).send(err.response?.data || "Error fetching recordings");
  }
}
export async function zoomWebhook(req, res) {
  const { event, payload } = req.body;
  if (event === "endpoint.url_validation") {
    const plainToken = payload.plainToken;
    const encryptedToken = crypto
      .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET)
      .update(plainToken)
      .digest("hex");
    return res.json({
      plainToken,
      encryptedToken,
    });
  }
  console.log("Zoom Event Received:", event);
  if (event === "recording.completed") {
    try {
      const files = payload.object.recording_files;

      for (let file of files) {
        if (file.download_url) {
          console.log("Downloading:", file.download_url);
          await processRecording(file.download_url);
        }
      }
    } catch (err) {
      console.error("Processing Error:", err);
    }
  }

  res.sendStatus(200);
}