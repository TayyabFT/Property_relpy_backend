import { ApiError } from "../../utils/ApiError.js";
import { visibleListingsQuery } from "../../utils/listingVisibility.js";
import { User } from "../auth/auth.model.js";
import { Listing } from "./listing.model.js";
import { ListingSave } from "./listingSave.model.js";
const PLAN_RANK = { Premium: 1, Commercial: 1, InvitedPartner: 1, VIP: 2, Ultra: 3 };

const FILTER_OPTIONS = {
  propertyTypes: [
    { value: "", label: "All Types" },
    { value: "House", label: "House" },
    { value: "Flat", label: "Flat" },
    { value: "HMO", label: "HMO" },
    { value: "Commercial", label: "Commercial" },
    { value: "Land", label: "Land" },
    { value: "Bungalow", label: "Bungalow" },
    { value: "Detached", label: "Detached" },
  ],
  priceRanges: [
    { value: "", label: "Any Price", min: null, max: null },
    { value: "under_75k", label: "Under £75k", min: 0, max: 75000 },
    { value: "75k_150k", label: "£75k–£150k", min: 75000, max: 150000 },
    { value: "150k_300k", label: "£150k–£300k", min: 150000, max: 300000 },
    { value: "300k_500k", label: "£300k–£500k", min: 300000, max: 500000 },
    { value: "500k_plus", label: "£500k+", min: 500000, max: null },
  ],
  minDiscounts: [
    { value: "", label: "Any" },
    { value: "10", label: "10%+" },
    { value: "20", label: "20%+" },
    { value: "25", label: "25%+" },
    { value: "30", label: "30%+" },
    { value: "40", label: "40%+" },
  ],
  strategies: [
    { value: "", label: "All Strategies" },
    { value: "Flip", label: "Flip" },
    { value: "Buy-to-Let", label: "Buy-to-Let" },
    { value: "HMO", label: "HMO" },
    { value: "Commercial Conversion", label: "Commercial Conversion" },
    { value: "Serviced Accommodation", label: "Serviced Accommodation" },
  ],
  bedrooms: [
    { value: "", label: "Any" },
    { value: "1", label: "1+" },
    { value: "2", label: "2+" },
    { value: "3", label: "3+" },
    { value: "4", label: "4+" },
    { value: "5", label: "5+" },
  ],
  sortOptions: [
    { value: "newest", label: "Newest" },
    { value: "discount", label: "Highest Discount" },
    { value: "price", label: "Lowest Price" },
    { value: "yield", label: "Yield" },
  ],
};

const PRICE_RANGE_MAP = Object.fromEntries(
  FILTER_OPTIONS.priceRanges.map((item) => [item.value, item]),
);

function formatGbp(amount) {
  return `£${amount.toLocaleString("en-GB")}`;
}

function relativeTimeLabel(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) return "Added just now";
  if (hours < 24) return `Added ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Added 1d ago";
  return `Added ${days}d ago`;
}

function relativeUpdatedLabel(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function userCanAccess(plan, accessTier) {
  return (PLAN_RANK[plan] || 0) >= PLAN_RANK[accessTier];
}

function lockInfo(accessTier) {
  if (accessTier === "VIP") {
    return { label: "VIP Required", buttonText: "Upgrade to VIP" };
  }
  return { label: "Premium Required", buttonText: "Upgrade" };
}

function formatListing(listing, { userPlan, savedIds }) {
  const isSaved = savedIds.has(listing._id.toString());
  const canAccess = userCanAccess(userPlan, listing.accessTier);
  const saving = listing.marketValue - listing.askingPrice;

  let footerButtonLabel = "View Deal →";
  let footerButtonClass = "btn btn-gold btn-sm";

  if (!canAccess) {
    footerButtonLabel =
      listing.accessTier === "VIP" ? "🔒 VIP Only" : "🔒 Unlock";
    footerButtonClass = "btn btn-outline btn-sm";
  }

  const metaParts = [relativeTimeLabel(listing.publishedAt)];
  if (listing.saveCount > 0) {
    metaParts.push(`${listing.saveCount} saves`);
  }

  return {
    id: listing._id.toString(),
    placeholder: listing.placeholder,
    discount: `▼ ${listing.discountPercent}%`,
    featured: listing.featured,
    lock: canAccess ? undefined : lockInfo(listing.accessTier),
    title: listing.title,
    location: `📍 ${listing.location}`,
    asking: formatGbp(listing.askingPrice),
    market: formatGbp(listing.marketValue),
    saving: saving > 0 ? formatGbp(saving) : undefined,
    tags: listing.tags.map((tag) => ({
      label: tag.label,
      badge: tag.badge || undefined,
    })),
    footerButtonLabel,
    footerButtonClass,
    meta: metaParts.join(" · "),
    isSaved,
    isLocked: !canAccess,
    canAccess,
    accessTier: listing.accessTier,
    propertyType: listing.propertyType,
    bedrooms: listing.bedrooms,
    yieldPercent: listing.yieldPercent,
    strategies: listing.strategies,
    saveCount: listing.saveCount,
    publishedAt: listing.publishedAt,
  };
}

function formatListingDetail(listing, { userPlan, isSaved }) {
  const base = formatListing(listing, {
    userPlan,
    savedIds: new Set(isSaved ? [listing._id.toString()] : []),
  });

  return {
    ...base,
    description: listing.description,
    sellerName: listing.sellerName,
    postcode: listing.postcode,
    askingPrice: listing.askingPrice,
    marketValue: listing.marketValue,
    discountPercent: listing.discountPercent,
  };
}

function buildSort(sort) {
  switch (sort) {
    case "discount":
      return { discountPercent: -1, publishedAt: -1 };
    case "price":
      return { askingPrice: 1, publishedAt: -1 };
    case "yield":
      return { yieldPercent: -1, publishedAt: -1 };
    case "newest":
    default:
      return { publishedAt: -1 };
  }
}

function buildQuery(filters) {
  const query = { status: "live" };

  if (filters.location?.trim()) {
    const term = filters.location.trim().toLowerCase();
    query.$or = [
      { locationSearch: { $regex: term, $options: "i" } },
      { location: { $regex: term, $options: "i" } },
      { postcode: { $regex: term, $options: "i" } },
    ];
  }

  if (filters.propertyType) {
    query.propertyType = filters.propertyType;
  }

  if (filters.minDiscount) {
    query.discountPercent = { $gte: Number(filters.minDiscount) };
  }

  if (filters.strategy) {
    query.strategies = filters.strategy;
  }

  if (filters.bedrooms) {
    query.bedrooms = { $gte: Number(filters.bedrooms) };
  }

  const priceRange = PRICE_RANGE_MAP[filters.priceRange || ""];
  if (priceRange?.min != null || priceRange?.max != null) {
    query.askingPrice = {};
    if (priceRange.min != null) query.askingPrice.$gte = priceRange.min;
    if (priceRange.max != null) query.askingPrice.$lte = priceRange.max;
  }

  return query;
}

async function getUserPlan(userId) {
  const user = await User.findById(userId).select("plan");
  return user?.plan || null;
}

async function getSavedIds(userId, listingIds) {
  if (!listingIds.length) return new Set();

  const saves = await ListingSave.find({
    userId,
    listingId: { $in: listingIds },
  }).select("listingId");

  return new Set(saves.map((item) => item.listingId.toString()));
}

export const listingsService = {
  getFilters() {
    return FILTER_OPTIONS;
  },

  async getPublicListings(limit = 6) {
    const safeLimit = Math.min(12, Math.max(1, Number(limit) || 6));
    const listings = await Listing.find(await visibleListingsQuery())
      .sort({ featured: -1, publishedAt: -1 })
      .limit(safeLimit);

    return {
      properties: listings.map((listing) =>
        formatListing(listing, { userPlan: null, savedIds: new Set() }),
      ),
    };
  },

  async getListings(userId, filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 6));
    const sort = filters.sort || "newest";
    const query = await visibleListingsQuery(buildQuery(filters));
    const userPlan = await getUserPlan(userId);

    const [total, listings, lastUpdated] = await Promise.all([
      Listing.countDocuments(query),
      Listing.find(query)
        .sort(buildSort(sort))
        .skip((page - 1) * limit)
        .limit(limit),
      Listing.findOne(await visibleListingsQuery())
        .sort({ updatedAt: -1 })
        .select("updatedAt"),
    ]);

    const savedIds = await getSavedIds(
      userId,
      listings.map((item) => item._id),
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      summary: {
        showing: listings.length,
        total,
        page,
        limit,
        totalPages,
        lastUpdated: relativeUpdatedLabel(
          lastUpdated?.updatedAt || new Date(),
        ),
        summaryText: `Showing ${listings.length} of ${total.toLocaleString("en-GB")} deals`,
      },
      sort,
      filters: {
        location: filters.location || "",
        propertyType: filters.propertyType || "",
        priceRange: filters.priceRange || "",
        minDiscount: filters.minDiscount || "",
        strategy: filters.strategy || "",
        bedrooms: filters.bedrooms || "",
      },
      properties: listings.map((listing) =>
        formatListing(listing, { userPlan, savedIds }),
      ),
      pagination: {
        page,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    };
  },

  async getListingById(userId, listingId) {
    const listing = await Listing.findOne(await visibleListingsQuery({ _id: listingId }));
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    const userPlan = await getUserPlan(userId);
    const isSaved = await ListingSave.exists({ userId, listingId });

    return formatListingDetail(listing, { userPlan, isSaved: Boolean(isSaved) });
  },

  async saveListing(userId, listingId) {
    const listing = await Listing.findOne(await visibleListingsQuery({ _id: listingId }));
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    const existing = await ListingSave.findOne({ userId, listingId });
    if (existing) {
      return { saved: true, saveCount: listing.saveCount };
    }

    await ListingSave.create({ userId, listingId });
    listing.saveCount += 1;
    await listing.save();

    return { saved: true, saveCount: listing.saveCount };
  },

  async unsaveListing(userId, listingId) {
    const listing = await Listing.findOne({ _id: listingId, status: "live" });
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    const removed = await ListingSave.findOneAndDelete({ userId, listingId });
    if (removed && listing.saveCount > 0) {
      listing.saveCount -= 1;
      await listing.save();
    }

    return { saved: false, saveCount: listing.saveCount };
  },

  async getSavedListingIds(userId) {
    const saves = await ListingSave.find({ userId })
      .sort({ savedAt: -1 })
      .select("listingId savedAt")
      .populate({ path: "listingId", select: "_id", match: await visibleListingsQuery() });

    return saves.filter((item) => item.listingId).map((item) => ({
      id: item.listingId._id.toString(),
      savedAt: item.savedAt,
    }));
  },
};
