import { authService } from "./auth.service.js";

export const authController = {
  async register(req, res) {
    const { firstName, lastName, email, password } = req.body;
    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result,
    });
  },

  async login(req, res) {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: "Signed in successfully",
      data: result,
    });
  },

  async me(req, res) {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  },

  async updateProfile(req, res) {
    const { firstName, lastName, phone, location, investorType, notificationPrefs } =
      req.body;
    const user = await authService.updateProfile(req.user.id, {
      firstName,
      lastName,
      phone,
      location,
      investorType,
      notificationPrefs,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated",
      data: { user },
    });
  },

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const data = await authService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: "Password updated",
      data,
    });
  },

  async logout(_req, res) {
    res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  },

  async forgotPassword(req, res) {
    const { email } = req.body;
    const data = await authService.forgotPassword({ email });
    res.status(200).json({ success: true, ...data });
  },

  async resetPassword(req, res) {
    const { token, newPassword } = req.body;
    const data = await authService.resetPassword({ token, newPassword });
    res.status(200).json({ success: true, ...data });
  },

  async verifyEmail(req, res) {
    const token = req.query.token || req.body?.token;
    const data = await authService.verifyEmail({ token });
    res.status(200).json({ success: true, ...data });
  },
};
