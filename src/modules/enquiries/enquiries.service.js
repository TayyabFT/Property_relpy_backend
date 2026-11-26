import { ApiError } from "../../utils/ApiError.js";
import { parsePagination, pageMeta } from "../../utils/pagination.js";
import { emailService } from "../../services/email.js";
import { env } from "../../config/env.js";
import { User } from "../auth/auth.model.js";
import { Listing } from "../listings/listing.model.js";
import { DealAnalysis } from "../dealAnalysis/dealAnalysis.model.js";
import { DealEnquiry } from "../dealAnalysis/dealEnquiry.model.js";
import { notificationService } from "../notifications/notification.service.js";

function inboxUrl() {
  return `${(env.clientUrl || "http://localhost:3000").replace(/\/$/, "")}/app/enquiries`;
}

function fullName(user) {
  if (!user) return "Member";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Member";
}

function formatTime(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function idsEqual(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function isSeller(enquiry, userId) {
  return idsEqual(enquiry.sellerUserId, userId);
}

function isBuyer(enquiry, userId) {
  return idsEqual(enquiry.buyerId, userId);
}

async function getOwnedListingIds(userId) {
  const listings = await Listing.find({ submittedBy: userId }).select("_id");
  return listings.map((l) => l._id);
}

/** Ensure listing owners are linked even if sellerUserId was missing historically */
async function ensureSellerLink(enquiry, userId) {
  if (isSeller(enquiry, userId) || isBuyer(enquiry, userId)) {
    return enquiry;
  }

  const listing = await Listing.findById(enquiry.listingId).select("submittedBy");
  if (listing && idsEqual(listing.submittedBy, userId)) {
    enquiry.sellerUserId = userId;
    await enquiry.save();
  }
  return enquiry;
}

async function assertParticipant(enquiry, userId) {
  await ensureSellerLink(enquiry, userId);
  if (!isSeller(enquiry, userId) && !isBuyer(enquiry, userId)) {
    throw new ApiError(403, "You do not have access to this enquiry");
  }
}

function lastMessageMeta(enquiry) {
  const replies = Array.isArray(enquiry.replies) ? enquiry.replies : [];
  if (replies.length === 0) {
    return {
      text: enquiry.message,
      at: enquiry.createdAt,
      role: "buyer",
    };
  }
  const last = replies[replies.length - 1];
  return {
    text: last.message,
    at: last.createdAt || enquiry.updatedAt,
    role: last.authorRole,
  };
}

function isUnreadFor(enquiry, userId) {
  const last = lastMessageMeta(enquiry);

  if (isSeller(enquiry, userId)) {
    if (!enquiry.sellerReadAt) return true;
    return new Date(last.at) > new Date(enquiry.sellerReadAt);
  }

  if (isBuyer(enquiry, userId)) {
    // Buyer is unread when the latest activity is from the seller after their last read
    if (last.role !== "seller") return false;
    if (!enquiry.buyerReadAt) return true;
    return new Date(last.at) > new Date(enquiry.buyerReadAt);
  }

  return false;
}

async function loadListingMap(listingIds) {
  const listings = await Listing.find({ _id: { $in: listingIds } }).select(
    "title location askingPrice submittedBy",
  );
  return new Map(listings.map((l) => [l._id.toString(), l]));
}

async function loadUserMap(userIds) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const users = await User.find({ _id: { $in: unique } }).select(
    "firstName lastName email phone",
  );
  return new Map(users.map((u) => [u._id.toString(), u]));
}

function buildMessages(enquiry, viewerId, buyer, seller) {
  const messages = [
    {
      id: `${enquiry._id}-root`,
      role: "buyer",
      authorName: fullName(buyer),
      message: enquiry.message,
      createdAt: enquiry.createdAt,
      createdAtLabel: formatTime(enquiry.createdAt),
      isMine: isBuyer(enquiry, viewerId),
    },
  ];

  const replies = Array.isArray(enquiry.replies) ? enquiry.replies : [];
  replies.forEach((reply, index) => {
    const author =
      reply.authorRole === "buyer"
        ? buyer
        : seller || { firstName: "Seller" };
    messages.push({
      id: reply._id ? String(reply._id) : `${enquiry._id}-reply-${index}`,
      role: reply.authorRole,
      authorName: fullName(author),
      message: reply.message,
      createdAt: reply.createdAt,
      createdAtLabel: formatTime(reply.createdAt),
      isMine: idsEqual(reply.authorId, viewerId),
    });
  });

  return messages;
}

function formatEnquiryListItem(enquiry, viewerId, listing, buyer, seller) {
  const asSeller = isSeller(enquiry, viewerId);
  const last = lastMessageMeta(enquiry);
  const counterparty = asSeller ? buyer : seller;

  return {
    id: enquiry._id.toString(),
    box: asSeller ? "inbox" : "sent",
    listingId: enquiry.listingId ? String(enquiry.listingId) : null,
    propertyTitle: listing?.title || "Property listing",
    location: listing?.location || "",
    askingPrice: listing?.askingPrice ?? null,
    status: enquiry.status === "sent" ? "open" : enquiry.status,
    unread: isUnreadFor(enquiry, viewerId),
    counterparty: {
      name: fullName(counterparty),
      email: counterparty?.email || (asSeller ? "" : enquiry.sellerEmail) || "",
      phone: counterparty?.phone || "",
    },
    preview: last.text || enquiry.message,
    lastMessageAt: last.at || enquiry.createdAt,
    lastMessageAtLabel: formatTime(last.at || enquiry.createdAt),
    createdAt: enquiry.createdAt,
    createdAtLabel: formatTime(enquiry.createdAt),
    replyCount: Array.isArray(enquiry.replies) ? enquiry.replies.length : 0,
  };
}

function formatEnquiryDetail(enquiry, viewerId, listing, buyer, seller) {
  return {
    ...formatEnquiryListItem(enquiry, viewerId, listing, buyer, seller),
    messages: buildMessages(enquiry, viewerId, buyer, seller),
    canReply: enquiry.status !== "closed",
  };
}

async function hydrateEnquiry(enquiry, viewerId) {
  const listing = await Listing.findById(enquiry.listingId).select(
    "title location askingPrice submittedBy",
  );
  const buyer = await User.findById(enquiry.buyerId).select(
    "firstName lastName email phone",
  );
  let seller = null;
  if (enquiry.sellerUserId) {
    seller = await User.findById(enquiry.sellerUserId).select(
      "firstName lastName email phone",
    );
  }
  return formatEnquiryDetail(enquiry, viewerId, listing, buyer, seller);
}

export const enquiriesService = {
  async list(userId, box = "all", paging = parsePagination()) {
    const ownedListingIds = await getOwnedListingIds(userId);

    // Backfill sellerUserId for owned listings so replies work reliably
    if (ownedListingIds.length) {
      await DealEnquiry.updateMany(
        {
          listingId: { $in: ownedListingIds },
          $or: [{ sellerUserId: null }, { sellerUserId: { $exists: false } }],
        },
        { $set: { sellerUserId: userId } },
      );
    }

    let filter;
    if (box === "sent") {
      filter = { buyerId: userId };
    } else if (box === "inbox") {
      filter = {
        $or: [
          { sellerUserId: userId },
          ...(ownedListingIds.length
            ? [{ listingId: { $in: ownedListingIds } }]
            : []),
        ],
      };
    } else {
      // all conversations for this user
      filter = {
        $or: [
          { buyerId: userId },
          { sellerUserId: userId },
          ...(ownedListingIds.length
            ? [{ listingId: { $in: ownedListingIds } }]
            : []),
        ],
      };
    }

    // Unread counts need every conversation, so page the formatted list below.
    const enquiries = await DealEnquiry.find(filter)
      .sort({ updatedAt: -1 })
      .limit(1000);

    const listingMap = await loadListingMap(
      enquiries.map((e) => e.listingId).filter(Boolean),
    );
    const userIds = [];
    for (const e of enquiries) {
      if (e.buyerId) userIds.push(String(e.buyerId));
      if (e.sellerUserId) userIds.push(String(e.sellerUserId));
    }
    const userMap = await loadUserMap(userIds);

    const items = enquiries.map((enquiry) => {
      // Ensure ownership link in-memory for formatting
      const listing = listingMap.get(String(enquiry.listingId));
      if (
        !enquiry.sellerUserId &&
        listing &&
        idsEqual(listing.submittedBy, userId)
      ) {
        enquiry.sellerUserId = userId;
      }

      const buyer = userMap.get(String(enquiry.buyerId));
      const seller = enquiry.sellerUserId
        ? userMap.get(String(enquiry.sellerUserId))
        : null;
      return formatEnquiryListItem(enquiry, userId, listing, buyer, seller);
    });

    return {
      box,
      unreadCount: items.filter((i) => i.unread).length,
      inboxUnread: items.filter((i) => i.box === "inbox" && i.unread).length,
      sentUnread: items.filter((i) => i.box === "sent" && i.unread).length,
      total: items.length,
      enquiries: items.slice(paging.skip, paging.skip + paging.limit),
      pagination: pageMeta(items.length, paging),
    };
  },

  async unreadCount(userId) {
    const data = await this.list(userId, "all");
    return {
      unreadCount: data.unreadCount,
      inboxUnread: data.inboxUnread,
      sentUnread: data.sentUnread,
    };
  },

  async getById(userId, enquiryId) {
    const enquiry = await DealEnquiry.findById(enquiryId);
    if (!enquiry) throw new ApiError(404, "Enquiry not found");
    await assertParticipant(enquiry, userId);

    const now = new Date();
    if (isSeller(enquiry, userId)) {
      enquiry.sellerReadAt = now;
    } else if (isBuyer(enquiry, userId)) {
      enquiry.buyerReadAt = now;
    }
    await enquiry.save();

    return hydrateEnquiry(enquiry, userId);
  },

  async reply(userId, enquiryId, { message }) {
    const trimmed = typeof message === "string" ? message.trim() : "";
    if (!trimmed) throw new ApiError(400, "Please enter a reply message.");
    if (trimmed.length > 2000) {
      throw new ApiError(400, "Reply must be 2000 characters or fewer.");
    }

    const enquiry = await DealEnquiry.findById(enquiryId);
    if (!enquiry) throw new ApiError(404, "Enquiry not found");
    await assertParticipant(enquiry, userId);

    if (enquiry.status === "closed") {
      throw new ApiError(400, "This enquiry thread is closed.");
    }

    const role = isSeller(enquiry, userId) ? "seller" : "buyer";
    enquiry.replies.push({
      authorId: userId,
      authorRole: role,
      message: trimmed,
    });
    enquiry.status = "replied";
    enquiry.updatedAt = new Date();

    if (role === "seller") {
      enquiry.sellerReadAt = new Date();
      enquiry.buyerReadAt = null; // mark unread for buyer
    } else {
      enquiry.buyerReadAt = new Date();
      enquiry.sellerReadAt = null; // mark unread for seller
    }

    await enquiry.save();

    // Re-load so nested reply ids/timestamps are fully present
    const fresh = await DealEnquiry.findById(enquiry._id);
    if (!fresh) throw new ApiError(500, "Failed to save reply");

    const listing = await Listing.findById(fresh.listingId).select("title");
    const buyer = await User.findById(fresh.buyerId).select(
      "firstName lastName email",
    );
    const seller = fresh.sellerUserId
      ? await User.findById(fresh.sellerUserId).select(
          "firstName lastName email",
        )
      : null;

    const author = await User.findById(userId).select("firstName lastName");
    const authorName = fullName(author);
    const propertyTitle = listing?.title || "your listing";

    if (role === "seller" && buyer?.email) {
      emailService.queueEmail(
        () =>
          emailService.sendEnquiryReply(
            buyer.email,
            buyer.firstName || "there",
            propertyTitle,
            authorName,
            trimmed,
            inboxUrl(),
          ),
        `enquiry-reply-buyer:${fresh._id}`,
      );
      await notificationService.create(buyer._id, {
        type: "deal",
        title: "Seller replied to your enquiry",
        body: `${authorName} replied about "${propertyTitle}". Open Enquiries → Sent to respond.`,
        channel: "Email + Platform",
      });
    }

    if (role === "buyer") {
      const sellerEmail = seller?.email || fresh.sellerEmail;
      if (sellerEmail) {
        emailService.queueEmail(
          () =>
            emailService.sendEnquiryReply(
              sellerEmail,
              seller?.firstName || "there",
              propertyTitle,
              authorName,
              trimmed,
              inboxUrl(),
            ),
          `enquiry-reply-seller:${fresh._id}`,
        );
      }
      if (fresh.sellerUserId) {
        await notificationService.create(fresh.sellerUserId, {
          type: "deal",
          title: "New reply on an enquiry",
          body: `${authorName} replied about "${propertyTitle}". Open Enquiries → Received to respond.`,
          channel: "Email + Platform",
        });
      }
    }

    return hydrateEnquiry(fresh, userId);
  },

  async markRead(userId, enquiryId) {
    const enquiry = await DealEnquiry.findById(enquiryId);
    if (!enquiry) throw new ApiError(404, "Enquiry not found");
    await assertParticipant(enquiry, userId);

    const now = new Date();
    if (isSeller(enquiry, userId)) enquiry.sellerReadAt = now;
    else enquiry.buyerReadAt = now;
    await enquiry.save();
    return { id: enquiry._id.toString(), unread: false };
  },

  async close(userId, enquiryId) {
    const enquiry = await DealEnquiry.findById(enquiryId);
    if (!enquiry) throw new ApiError(404, "Enquiry not found");
    await assertParticipant(enquiry, userId);

    enquiry.status = "closed";
    await enquiry.save();
    return { id: enquiry._id.toString(), status: "closed" };
  },

  async resolveSellerUserId(listing, sellerEmail) {
    if (listing.submittedBy) return listing.submittedBy;
    if (!sellerEmail) return null;
    const user = await User.findOne({
      email: sellerEmail.toLowerCase().trim(),
    }).select("_id");
    return user?._id || null;
  },

  async getSellerDisplay(listingId, sellerUserId, sellerEmail) {
    if (sellerUserId) {
      const user = await User.findById(sellerUserId).select(
        "firstName lastName email",
      );
      if (user) return { name: fullName(user), email: user.email };
    }
    const analysis = await DealAnalysis.findOne({ listingId }).select(
      "contact.name contact.email",
    );
    return {
      name: analysis?.contact?.name || "Seller",
      email: analysis?.contact?.email || sellerEmail || "",
    };
  },
};

export { inboxUrl, fullName };
