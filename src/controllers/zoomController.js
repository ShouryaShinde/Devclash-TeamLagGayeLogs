import axios from "axios";
import crypto from "crypto";
import getAccessToken from "../services/zoomAuth.js";
import { processRecording } from "../services/processingService.js";

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

    // 🔥 IMPORTANT: Replace this with your actual userId
    const userId = "FEvda4lVQzmZ9ITVH-Stuw";

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

/**
 * 🔔 Zoom Webhook Handler
 */
export async function zoomWebhook(req, res) {
  const { event, payload } = req.body;

  /**
   * 🔐 URL Validation (MANDATORY)
   */
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

  console.log("🔔 Zoom Event Received:", event);

  /**
   * 🎯 Recording Completed Event
   */
  if (event === "recording.completed") {
    try {
      const files = payload.object.recording_files;

      for (let file of files) {
        if (file.download_url) {
          console.log("📥 Downloading:", file.download_url);
          await processRecording(file.download_url);
        }
      }
    } catch (err) {
      console.error("Processing Error:", err);
    }
  }

  res.sendStatus(200);
}