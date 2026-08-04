import { listingsService } from "./listings.service.js";

export const listingsController = {
  async getFilters(_req, res) {
    const data = listingsService.getFilters();

    res.status(200).json({
      success: true,
      data,
    });
  },

  async getPublicListings(req, res) {
    const data = await listingsService.getPublicListings(req.query.limit);

    res.status(200).json({
      success: true,
      data,
    });
  },

  async getListings(req, res) {
    const data = await listingsService.getListings(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data,
    });
  },

  async getListingById(req, res) {
    const data = await listingsService.getListingById(
      req.user.id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data,
    });
  },

  async saveListing(req, res) {
    const data = await listingsService.saveListing(
      req.user.id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Deal saved to your favourites",
      data,
    });
  },

  async unsaveListing(req, res) {
    const data = await listingsService.unsaveListing(
      req.user.id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Deal removed from favourites",
      data,
    });
  },

  async getSavedListingIds(req, res) {
    const data = await listingsService.getSavedListingIds(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  },
};
