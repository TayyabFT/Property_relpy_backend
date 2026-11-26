import { adminService } from "./admin.service.js";
import { parsePagination } from "../../utils/pagination.js";

export const adminController = {
  async stats(_req, res) {
    const data = await adminService.getStats();
    res.status(200).json({ success: true, data });
  },

  async submissions(req, res) {
    const { status } = req.query;
    const { items, pagination } = await adminService.getSubmissionQueue(status, parsePagination(req.query));
    res.status(200).json({ success: true, data: items, pagination });
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
    const { items, pagination } = await adminService.getUsers({ search, plan, status }, parsePagination(req.query));
    res.status(200).json({ success: true, data: items, pagination });
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

  async listAdmins(req, res) {
    const { items, pagination } = await adminService.listAdmins(parsePagination(req.query));
    res.status(200).json({ success: true, data: items, pagination });
  },

  async createAdmin(req, res) {
    const { email, password, firstName, lastName } = req.body || {};
    const data = await adminService.createAdmin({
      email,
      password,
      firstName,
      lastName,
    });
    res.status(201).json({
      success: true,
      message: data.promoted
        ? "Existing user promoted to admin"
        : "Admin account created",
      data,
    });
  },

  async reports(req, res) {
    const { items, pagination } = await adminService.getReports(parsePagination(req.query));
    res.status(200).json({ success: true, data: items, pagination });
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

  async listings(req, res) {
    const { items, pagination } = await adminService.getLiveListings(parsePagination(req.query));
    res.status(200).json({ success: true, data: items, pagination });
  },

  async markSold(req, res) {
    const { salePrice, partnerFeeGBP } = req.body;
    const data = await adminService.markListingSold(
      req.params.id,
      salePrice,
      partnerFeeGBP,
    );
    res
      .status(200)
      .json({ success: true, message: "Listing marked as sold", data });
  },

  async listCommercialInvites(req, res) {
    const { items, pagination } = await adminService.listCommercialInvites(parsePagination(req.query));
    res.status(200).json({ success: true, data: items, pagination });
  },

  async createCommercialInvite(req, res) {
    const { email, note, daysValid } = req.body || {};
    const data = await adminService.createCommercialInvite(req.user.id, {
      email,
      note,
      daysValid,
    });
    res.status(201).json({
      success: true,
      message: "Founders Club invite created",
      data,
    });
  },

  async revokeCommercialInvite(req, res) {
    const data = await adminService.revokeCommercialInvite(req.params.id);
    res.status(200).json({ success: true, message: "Invite revoked", data });
  },

  async grantCommercial(req, res) {
    const { months } = req.body || {};
    const data = await adminService.grantCommercialPartnership(req.params.id, {
      months,
    });
    res.status(200).json({
      success: true,
      message: "Founders Club partnership granted",
      data,
    });
  },
};
