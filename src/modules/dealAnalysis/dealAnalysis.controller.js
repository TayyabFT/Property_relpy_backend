import { dealAnalysisService } from "./dealAnalysis.service.js";

export const dealAnalysisController = {
  async getReportReasons(_req, res) {
    const data = dealAnalysisService.getReportReasons();

    res.status(200).json({
      success: true,
      data,
    });
  },

  async getDeals(req, res) {
    const data = await dealAnalysisService.getDeals(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  },

  async getAnalysis(req, res) {
    const data = await dealAnalysisService.getAnalysis(
      req.user.id,
      req.params.listingId,
    );

    res.status(200).json({
      success: true,
      data,
    });
  },

  async saveDeal(req, res) {
    const data = await dealAnalysisService.saveDeal(
      req.user.id,
      req.params.listingId,
    );

    res.status(200).json({
      success: true,
      message: "Deal saved to your favourites",
      data,
    });
  },

  async unsaveDeal(req, res) {
    const data = await dealAnalysisService.unsaveDeal(
      req.user.id,
      req.params.listingId,
    );

    res.status(200).json({
      success: true,
      message: "Deal removed from favourites",
      data,
    });
  },

  async reportDeal(req, res) {
    const data = await dealAnalysisService.reportDeal(
      req.user.id,
      req.params.listingId,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: data.message,
      data,
    });
  },

  async getContact(req, res) {
    const data = await dealAnalysisService.getContact(
      req.user.id,
      req.params.listingId,
    );

    res.status(200).json({
      success: true,
      data,
    });
  },

  async sendEnquiry(req, res) {
    const data = await dealAnalysisService.sendEnquiry(
      req.user.id,
      req.params.listingId,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: data.message,
      data,
    });
  },
};
