import { overviewService } from "./overview.service.js";

export const overviewController = {
  async getOverview(req, res) {
    const data = await overviewService.getOverview(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  },

  async removeSaved(req, res) {
    const data = await overviewService.removeSavedProperty(
      req.user.id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Removed from saved properties",
      data,
    });
  },
};
