import { Visit } from "../models/Visit.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getVisitAnalytics(req, res) {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const since = new Date(Date.now() - days * DAY_MS);

    const [total, unique, recent, daily, byDevice, byBrowser, byOs, topPaths] = await Promise.all([
      Visit.countDocuments({ createdAt: { $gte: since } }),
      Visit.distinct("ip", { createdAt: { $gte: since }, ip: { $ne: "" } }),
      Visit.find({ createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(100)
        .select("ip path browser os device city country referrer took createdAt")
        .lean(),
      Visit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            unique: { $addToSet: "$ip" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Visit.aggregate([
        { $match: { createdAt: { $gte: since }, device: { $ne: "" } } },
        { $group: { _id: "$device", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Visit.aggregate([
        { $match: { createdAt: { $gte: since }, browser: { $ne: "" } } },
        { $group: { _id: "$browser", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Visit.aggregate([
        { $match: { createdAt: { $gte: since }, os: { $ne: "" } } },
        { $group: { _id: "$os", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Visit.aggregate([
        { $match: { createdAt: { $gte: since }, path: { $ne: "" } } },
        { $group: { _id: "$path", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
    ]);

    const byIp = await Visit.aggregate([
      { $match: { createdAt: { $gte: since }, ip: { $ne: "" } } },
      {
        $group: {
          _id: "$ip",
          count: { $sum: 1 },
          lastSeen: { $max: "$createdAt" },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: 40 },
    ]);

    res.json({
      periodDays: days,
      total,
      unique: unique.length,
      daily: daily.map((d) => ({
        date: d._id,
        count: d.count,
        unique: (d.unique || []).filter(Boolean).length,
      })),
      devices: byDevice.map((d) => ({ label: d._id || "Unknown", count: d.count })),
      browsers: byBrowser.map((d) => ({ label: d._id || "Unknown", count: d.count })),
      os: byOs.map((d) => ({ label: d._id || "Unknown", count: d.count })),
      paths: topPaths.map((p) => ({ path: p._id || "/", count: p.count })),
      ips: byIp.map((v) => ({
        ip: v._id,
        count: v.count,
        lastSeen: v.lastSeen,
      })),
      recent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}