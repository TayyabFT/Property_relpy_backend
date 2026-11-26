import { Notification } from "./notification.model.js";
import { parsePagination, pageMeta } from "../../utils/pagination.js";

const TYPE_ICONS = {
  welcome: { icon: "👋", iconBg: "rgba(74,96,128,.15)" },
  deal: { icon: "🏠", iconBg: "rgba(34,200,122,.15)" },
  approved: { icon: "✅", iconBg: "rgba(212,168,67,.15)" },
  rejected: { icon: "❌", iconBg: "rgba(232,64,64,.15)" },
  membership: { icon: "💳", iconBg: "rgba(74,96,128,.15)" },
  security: { icon: "🔐", iconBg: "rgba(74,96,128,.15)" },
  system: { icon: "🔔", iconBg: "rgba(74,96,128,.15)" },
};

function relativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export const notificationService = {
  async create(userId, { type = "system", title, body, channel = "Platform" }) {
    try {
      return await Notification.create({ userId, type, title, body, channel });
    } catch {
      // Notifications are non-critical; never block the main flow.
      return null;
    }
  },

  async list(userId, paging = parsePagination()) {
    const [items, unread, total] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
      Notification.countDocuments({ userId, read: false }),
      Notification.countDocuments({ userId }),
    ]);

    return {
      unreadCount: unread,
      pagination: pageMeta(total, paging),
      notifications: items.map((n) => {
        const preset = TYPE_ICONS[n.type] || TYPE_ICONS.system;
        return {
          id: n._id.toString(),
          unread: !n.read,
          icon: preset.icon,
          iconBg: preset.iconBg,
          title: n.title,
          body: n.body,
          time: `${relativeTime(n.createdAt)} · ${n.channel}`,
        };
      }),
    };
  },

  async markAllRead(userId) {
    await Notification.updateMany({ userId, read: false }, { read: true });
    return { read: true };
  },
};
