import express from "express";
import {
  testToken,
  getRecordings,
  zoomWebhook,
  getUsers
} from "../controllers/zoomController.js";

const router = express.Router();

router.get("/test-token", testToken);
router.get("/recordings", getRecordings);
router.get("/users", getUsers);
router.post("/webhook", zoomWebhook);

export default router;