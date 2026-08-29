import { InstaPost } from "../models/InstaPost.js";

export async function listInstaPosts(req, res) {
  const posts = await InstaPost.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  res.json(posts);
}