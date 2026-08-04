import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { ReactElement } from "react";
import WelcomeEmail from "../../emails/WelcomeEmail";
import EmailVerificationEmail from "../../emails/EmailVerificationEmail";
import PasswordResetEmail from "../../emails/PasswordResetEmail";
import ListingApprovedEmail from "../../emails/ListingApprovedEmail";
import ListingRejectedEmail from "../../emails/ListingRejectedEmail";
import NewDealAlertEmail from "../../emails/NewDealAlertEmail";
import MembershipRenewalReminderEmail from "../../emails/MembershipRenewalReminderEmail";
import KYCStatusEmail from "../../emails/KYCStatusEmail";
import AdminNewSubmissionEmail from "../../emails/AdminNewSubmissionEmail";
import EnquiryToSellerEmail from "../../emails/EnquiryToSellerEmail";
import EnquiryConfirmationEmail from "../../emails/EnquiryConfirmationEmail";
import EnquiryReplyEmail from "../../emails/EnquiryReplyEmail";

type SendEmailOptions = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

type SendResult = {
  success: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
};

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey = "";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.EMAIL_FROM || user || "noreply@propertyreply.co.uk";
  return { host, port, secure, user, pass, from };
}

function getTransporter(): Transporter | null {
  const { host, port, secure, user, pass } = getSmtpConfig();

  if (!user || !pass) {
    return null;
  }

  const key = `${host}:${port}:${user}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  cachedTransporterKey = key;
  return cachedTransporter;
}

async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: SendEmailOptions): Promise<SendResult> {
  const transporter = getTransporter();
  const { from } = getSmtpConfig();

  if (!transporter) {
    console.warn(`[email] SMTP_USER/SMTP_PASS not set — skipping: ${subject}`);
    return { success: false, skipped: true, error: "not_configured" };
  }

  try {
    const html = await render(react);

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    return { success: true, id: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error(`[email] Failed to send "${subject}" to ${to}:`, message);
    return { success: false, error: message };
  }
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  verificationLink: string,
) {
  return sendEmail({
    to,
    subject: "Welcome to PropertyReply",
    react: WelcomeEmail({ firstName, verificationLink }),
  });
}

export async function sendEmailVerification(
  to: string,
  firstName: string,
  verificationLink: string,
) {
  return sendEmail({
    to,
    subject: "Verify your PropertyReply email",
    react: EmailVerificationEmail({ firstName, verificationLink }),
  });
}

export async function sendPasswordReset(
  to: string,
  firstName: string,
  resetLink: string,
) {
  return sendEmail({
    to,
    subject: "Reset your PropertyReply password",
    react: PasswordResetEmail({ firstName, resetLink }),
  });
}

export async function sendListingApproved(
  to: string,
  firstName: string,
  propertyTitle: string,
  listingUrl: string,
) {
  return sendEmail({
    to,
    subject: `Listing approved: ${propertyTitle}`,
    react: ListingApprovedEmail({ firstName, propertyTitle, listingUrl }),
  });
}

export async function sendListingRejected(
  to: string,
  firstName: string,
  propertyTitle: string,
  reason: string,
  resubmitUrl?: string,
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: `Listing update: ${propertyTitle}`,
    react: ListingRejectedEmail({
      firstName,
      propertyTitle,
      reason,
      resubmitUrl: resubmitUrl || `${clientUrl}/app/submit`,
    }),
  });
}

export async function sendNewDealAlert(
  to: string,
  firstName: string,
  property: {
    title: string;
    price: string;
    discount: string;
    location: string;
    url: string;
  },
) {
  return sendEmail({
    to,
    subject: `New deal: ${property.title}`,
    react: NewDealAlertEmail({ firstName, property }),
  });
}

export async function sendMembershipReminder(
  to: string,
  firstName: string,
  plan: string,
  renewalDate: string,
  price: string,
  billingUrl?: string,
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: `Your ${plan} membership renews in 7 days`,
    react: MembershipRenewalReminderEmail({
      firstName,
      plan,
      renewalDate,
      price,
      billingUrl: billingUrl || `${clientUrl}/app/profile`,
    }),
  });
}

export async function sendKYCStatus(
  to: string,
  firstName: string,
  status: "approved" | "rejected",
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject:
      status === "approved"
        ? "Identity verification approved"
        : "Identity verification update",
    react: KYCStatusEmail({
      firstName,
      status,
      supportUrl: "mailto:support@propertyreply.co.uk",
      dashboardUrl: `${clientUrl}/app/kyc`,
    }),
  });
}

export async function sendAdminNewSubmission(
  to: string,
  propertyTitle: string,
  submitterName: string,
  submitterEmail: string,
  reviewUrl?: string,
) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: `New listing submitted: ${propertyTitle}`,
    react: AdminNewSubmissionEmail({
      propertyTitle,
      submitterName,
      submitterEmail,
      reviewUrl: reviewUrl || `${clientUrl}/app/admin`,
    }),
  });
}

export async function sendEnquiryToSeller(
  to: string,
  sellerName: string,
  propertyTitle: string,
  buyerName: string,
  buyerEmail: string,
  buyerPhone: string,
  message: string,
  inboxUrl?: string,
) {
  return sendEmail({
    to,
    subject: `New enquiry about "${propertyTitle}"`,
    react: EnquiryToSellerEmail({
      sellerName,
      propertyTitle,
      buyerName,
      buyerEmail,
      buyerPhone,
      message,
      inboxUrl:
        inboxUrl ||
        `${process.env.CLIENT_URL || "http://localhost:3000"}/app/enquiries`,
    }),
    replyTo: buyerEmail,
  });
}

export async function sendEnquiryConfirmation(
  to: string,
  buyerFirstName: string,
  propertyTitle: string,
  sellerName: string,
  inboxUrl?: string,
) {
  return sendEmail({
    to,
    subject: `Your enquiry about "${propertyTitle}" has been sent`,
    react: EnquiryConfirmationEmail({
      buyerFirstName,
      propertyTitle,
      sellerName,
      inboxUrl:
        inboxUrl ||
        `${process.env.CLIENT_URL || "http://localhost:3000"}/app/enquiries`,
    }),
  });
}

export async function sendEnquiryReply(
  to: string,
  recipientFirstName: string,
  propertyTitle: string,
  authorName: string,
  message: string,
  inboxUrl: string,
) {
  return sendEmail({
    to,
    subject: `New reply about "${propertyTitle}"`,
    react: EnquiryReplyEmail({
      recipientFirstName,
      propertyTitle,
      authorName,
      message,
      inboxUrl,
    }),
  });
}

/** Fire-and-forget wrapper for route handlers */
export function queueEmail(
  task: () => Promise<SendResult>,
  label: string,
): void {
  task().catch((err) => {
    console.error(`[email] Background task failed (${label}):`, err);
  });
}

export const emailService = {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendListingApproved,
  sendListingRejected,
  sendNewDealAlert,
  sendMembershipReminder,
  sendKYCStatus,
  sendAdminNewSubmission,
  sendEnquiryToSeller,
  sendEnquiryConfirmation,
  sendEnquiryReply,
  queueEmail,
};
