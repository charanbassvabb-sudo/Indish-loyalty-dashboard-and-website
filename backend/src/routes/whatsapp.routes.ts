import { Router } from "express";
import { verifyWebhook, receiveWebhook } from "../controllers/whatsapp.controller";

// Deliberately unauthenticated (Meta calls this directly, no session/cookie
// involved) — protected instead by the verify-token handshake (GET) and the
// X-Hub-Signature-256 check (POST), both in the controller.
const router = Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", receiveWebhook);

export default router;
