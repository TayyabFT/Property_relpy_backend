function formatGbpRange(low, high) {
  const fmt = (n) => `£${n.toLocaleString("en-GB")}`;
  return `${fmt(low)} – ${fmt(high)}`;
}

/**
 * Build DealAnalysis fields from a live listing (and optional submission contact).
 * Used when a listing is approved or when analysis is requested for the first time.
 */
export function buildAnalysisPayload(listing, options = {}) {
  const asking = listing.askingPrice || 0;
  const market = listing.marketValue || asking;
  const contact = options.contact || {};

  const stampDuty = Math.round(asking * 0.05);
  const refurbishment = Math.round(asking * 0.12);
  const legalFinanceCosts = Math.round(asking * 0.02);
  const estimatedSalePrice = market;

  const yieldPercent = listing.yieldPercent || 5.5;
  const grossMonthlyRent = Math.round((asking * (yieldPercent / 100)) / 12);
  const mortgageMonthly = Math.round((asking * 0.75 * 0.05) / 12);
  const managementMonthly = Math.round(grossMonthlyRent * 0.1);
  const insuranceMaintenanceMonthly = Math.round(120 + grossMonthlyRent * 0.05);

  const address =
    options.address ||
    [listing.location, listing.postcode].filter(Boolean).join(" · ") ||
    listing.title;

  const comparableLow = Math.round(market * 0.9);
  const comparableHigh = Math.round(market * 1.1);

  return {
    listingId: listing._id,
    address,
    sellerKycPassed: options.sellerKycPassed ?? false,
    askingNote: "Negotiable",
    marketNote: "Est. via comparables",
    stampDuty,
    refurbishment,
    legalFinanceCosts,
    estimatedSalePrice,
    grossMonthlyRent,
    mortgageMonthly,
    managementMonthly,
    insuranceMaintenanceMonthly,
    sellerDescription:
      listing.description || options.description || "No description provided.",
    comparableRange: formatGbpRange(comparableLow, comparableHigh),
    contact: {
      name: contact.name || listing.sellerName || "",
      phone: contact.phone || "",
      email: contact.email || "",
      role: contact.role || "",
    },
  };
}
