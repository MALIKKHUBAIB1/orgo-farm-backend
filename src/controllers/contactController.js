import { ContactMessage } from "../models/ContactMessage.js";
import { parseContact, validationError } from "../middleware/security.js";
import { sendContactEmails } from "../utils/contactEmail.js";

export async function createMessage(req, res) {
  let message;
  try {
    message = parseContact(req.body);
  } catch (error) {
    return validationError(res, error);
  }

  try {
    const doc = await ContactMessage.create(message);
    await sendContactEmails(message);
    res.status(201).json({ id: doc._id, ok: true });
  } catch (error) {
    console.error("[contact-email]", error.message);
    res.status(502).json({ error: "We could not send your message. Please try again." });
  }
}

export async function listMessages(req, res) {
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(messages);
}
