import { adminService } from "./admin.service.js";

export const adminController = {
  async stats(_req, res) {
    const data = await adminService.getStats();
    res.status(200).json({ success: true, data });
  },

  async submissions(req, res) {
    const { status } = req.query;
    const data = await adminService.getSubmissionQueue(status);
    res.status(200).json({ success: true, data });
  },

  async approveSubmission(req, res) {
    const data = await adminService.approveSubmission(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Submission approved and published", data });
  },

  async rejectSubmission(req, res) {
    const { reason } = req.body || {};
    const data = await adminService.rejectSubmission(req.params.id, reason);
    res.status(200).json({ success: true, message: "Submission rejected", data });
  },

  async users(req, res) {
    const { search, plan, status } = req.query;
    const data = await adminService.getUsers({ search, plan, status });
    res.status(200).json({ success: true, data });
  },

  async updateUser(req, res) {
    const { plan, status, kycStatus } = req.body;
    const data = await adminService.updateUser(req.params.id, {
      plan,
      status,
      kycStatus,
    });
    res.status(200).json({ success: true, message: "User updated", data });
  },

  async deleteUser(req, res) {
    const data = await adminService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: "User deleted", data });
  },

  async reports(_req, res) {
    const data = await adminService.getReports();
    res.status(200).json({ success: true, data });
  },

  async resolveReport(req, res) {
    const data = await adminService.resolveReport(req.params.id);
    res.status(200).json({ success: true, message: "Report resolved", data });
  },

  async removeListing(req, res) {
    const data = await adminService.removeListing(req.params.id);
    res.status(200).json({ success: true, message: "Listing removed", data });
  },

  async toggleFeatured(req, res) {
    const data = await adminService.toggleFeatured(req.params.id);
    res.status(200).json({ success: true, data });
  },

  async listings(_req, res) {
    const data = await adminService.getLiveListings();
    res.status(200).json({ success: true, data });
  },

  async markSold(req, res) {
    const { salePrice } = req.body;
    const data = await adminService.markListingSold(req.params.id, salePrice);
    res
      .status(200)
      .json({ success: true, message: "Listing marked as sold", data });
  },
};
