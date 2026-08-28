// src/services/email.ts
import { render } from "@react-email/render";
import nodemailer from "nodemailer";

// emails/WelcomeEmail.tsx
import { Text as Text2 } from "@react-email/components";

// emails/components/EmailButton.tsx
import { Button } from "@react-email/components";

// emails/components/EmailLayout.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var brand = {
  navy: "#0B1628",
  navyLight: "#132238",
  gold: "#D4A843",
  goldDark: "#B8922F",
  text: "#E8EDF5",
  muted: "#8A9BB5",
  border: "#1E3354"
};
function EmailLayout({ preview, title, children }) {
  return /* @__PURE__ */ jsxs(Html, { children: [
    /* @__PURE__ */ jsx(Head, {}),
    /* @__PURE__ */ jsx(Preview, { children: preview }),
    /* @__PURE__ */ jsx(Body, { style: body, children: /* @__PURE__ */ jsxs(Container, { style: container, children: [
      /* @__PURE__ */ jsxs(Section, { style: header, children: [
        /* @__PURE__ */ jsx(Text, { style: logo, children: "PropertyReply" }),
        /* @__PURE__ */ jsx(Text, { style: tagline, children: "UK Below-Market Property Marketplace" })
      ] }),
      /* @__PURE__ */ jsxs(Section, { style: card, children: [
        /* @__PURE__ */ jsx(Heading, { style: heading, children: title }),
        children
      ] }),
      /* @__PURE__ */ jsx(Hr, { style: hr }),
      /* @__PURE__ */ jsxs(Text, { style: footer, children: [
        "\xA9 ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " PropertyReply. All rights reserved.",
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx(Link, { href: "https://propertyreply.co.uk", style: footerLink, children: "propertyreply.co.uk" }),
        " \xB7 ",
        /* @__PURE__ */ jsx(Link, { href: "mailto:support@propertyreply.co.uk", style: footerLink, children: "support@propertyreply.co.uk" })
      ] })
    ] }) })
  ] });
}
var body = {
  backgroundColor: brand.navy,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "32px 16px"
};
var container = {
  margin: "0 auto",
  maxWidth: "560px"
};
var header = {
  textAlign: "center",
  marginBottom: "24px"
};
var logo = {
  color: brand.gold,
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "0.5px",
  margin: "0 0 4px"
};
var tagline = {
  color: brand.muted,
  fontSize: "12px",
  margin: "0",
  textTransform: "uppercase",
  letterSpacing: "1.5px"
};
var card = {
  backgroundColor: brand.navyLight,
  border: `1px solid ${brand.border}`,
  borderRadius: "12px",
  padding: "32px 28px"
};
var heading = {
  color: brand.text,
  fontSize: "22px",
  fontWeight: "600",
  lineHeight: "1.35",
  margin: "0 0 20px"
};
var hr = {
  borderColor: brand.border,
  margin: "28px 0 16px"
};
var footer = {
  color: brand.muted,
  fontSize: "12px",
  lineHeight: "1.6",
  textAlign: "center"
};
var footerLink = {
  color: brand.gold,
  textDecoration: "none"
};
var paragraph = {
  color: brand.text,
  fontSize: "15px",
  lineHeight: "1.65",
  margin: "0 0 16px"
};
var mutedText = {
  color: brand.muted,
  fontSize: "13px",
  lineHeight: "1.55",
  margin: "16px 0 0"
};
var highlightBox = {
  backgroundColor: brand.navy,
  border: `1px solid ${brand.border}`,
  borderRadius: "8px",
  padding: "16px 18px",
  margin: "20px 0"
};
var highlightLabel = {
  color: brand.muted,
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  margin: "0 0 4px"
};
var highlightValue = {
  color: brand.gold,
  fontSize: "18px",
  fontWeight: "600",
  margin: "0"
};
var ctaButton = {
  backgroundColor: brand.gold,
  color: brand.navy,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "12px 20px",
  borderRadius: "8px",
  textDecoration: "none"
};

// emails/components/EmailButton.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function EmailButton({ href, children }) {
  return /* @__PURE__ */ jsx2(Button, { href, style: button, children });
}
var button = {
  backgroundColor: brand.gold,
  borderRadius: "8px",
  color: brand.navy,
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: "1",
  padding: "14px 28px",
  textDecoration: "none",
  textAlign: "center",
  margin: "8px 0 20px"
};

// emails/WelcomeEmail.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function WelcomeEmail({
  firstName,
  verificationLink
}) {
  return /* @__PURE__ */ jsxs2(
    EmailLayout,
    {
      preview: `Welcome to PropertyReply, ${firstName}!`,
      title: `Welcome, ${firstName}!`,
      children: [
        /* @__PURE__ */ jsx3(Text2, { style: paragraph, children: "Thanks for joining PropertyReply \u2014 the UK's marketplace for verified below-market-value property deals." }),
        /* @__PURE__ */ jsx3(Text2, { style: paragraph, children: "Browse curated BMV listings, run full deal analysis, and connect with verified sellers. To get started, please verify your email address." }),
        /* @__PURE__ */ jsx3(EmailButton, { href: verificationLink, children: "Verify Email Address" }),
        /* @__PURE__ */ jsx3(Text2, { style: mutedText, children: "You can also complete identity verification (KYC) from your dashboard to unlock listing submission and seller contact details." })
      ]
    }
  );
}
WelcomeEmail.PreviewProps = {
  firstName: "James",
  verificationLink: "https://propertyreply.co.uk/verify-email?token=example"
};

// emails/EmailVerificationEmail.tsx
import { Text as Text3 } from "@react-email/components";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function EmailVerificationEmail({
  firstName,
  verificationLink
}) {
  return /* @__PURE__ */ jsxs3(
    EmailLayout,
    {
      preview: "Verify your PropertyReply email address",
      title: "Verify your email",
      children: [
        /* @__PURE__ */ jsxs3(Text3, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", please confirm your email address to activate your PropertyReply account."
        ] }),
        /* @__PURE__ */ jsx4(EmailButton, { href: verificationLink, children: "Verify Email" }),
        /* @__PURE__ */ jsx4(Text3, { style: mutedText, children: "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email." })
      ]
    }
  );
}
EmailVerificationEmail.PreviewProps = {
  firstName: "James",
  verificationLink: "https://propertyreply.co.uk/verify-email?token=example"
};

// emails/PasswordResetEmail.tsx
import { Text as Text4 } from "@react-email/components";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function PasswordResetEmail({
  firstName,
  resetLink
}) {
  return /* @__PURE__ */ jsxs4(
    EmailLayout,
    {
      preview: "Reset your PropertyReply password",
      title: "Reset your password",
      children: [
        /* @__PURE__ */ jsxs4(Text4, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", we received a request to reset your PropertyReply password."
        ] }),
        /* @__PURE__ */ jsx5(EmailButton, { href: resetLink, children: "Reset Password" }),
        /* @__PURE__ */ jsx5(Text4, { style: mutedText, children: "This link expires in 1 hour." }),
        /* @__PURE__ */ jsx5(
          Text4,
          {
            style: {
              ...mutedText,
              color: brand.gold,
              marginTop: "20px"
            },
            children: "If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Contact support if you're concerned about your account security."
          }
        )
      ]
    }
  );
}
PasswordResetEmail.PreviewProps = {
  firstName: "James",
  resetLink: "https://propertyreply.co.uk/reset-password?token=example"
};

// emails/ListingApprovedEmail.tsx
import { Section as Section3, Text as Text5 } from "@react-email/components";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function ListingApprovedEmail({
  firstName,
  propertyTitle,
  listingUrl
}) {
  return /* @__PURE__ */ jsxs5(
    EmailLayout,
    {
      preview: `Your listing "${propertyTitle}" is now live!`,
      title: "Listing approved \u2014 congratulations!",
      children: [
        /* @__PURE__ */ jsxs5(Text5, { style: paragraph, children: [
          "Great news, ",
          firstName,
          "! Your property listing has been reviewed and approved by our team."
        ] }),
        /* @__PURE__ */ jsxs5(Section3, { style: highlightBox, children: [
          /* @__PURE__ */ jsx6(Text5, { style: highlightLabel, children: "Property" }),
          /* @__PURE__ */ jsx6(Text5, { style: highlightValue, children: propertyTitle })
        ] }),
        /* @__PURE__ */ jsx6(Text5, { style: paragraph, children: "Your listing is now live on the PropertyReply marketplace and visible to UK property investors." }),
        /* @__PURE__ */ jsx6(EmailButton, { href: listingUrl, children: "View Live Listing" })
      ]
    }
  );
}
ListingApprovedEmail.PreviewProps = {
  firstName: "James",
  propertyTitle: "3-Bed Victorian Terrace \u2014 Leeds LS8",
  listingUrl: "https://propertyreply.co.uk/app/listings/example"
};

// emails/ListingRejectedEmail.tsx
import { Section as Section4, Text as Text6 } from "@react-email/components";
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
function ListingRejectedEmail({
  firstName,
  propertyTitle,
  reason,
  resubmitUrl
}) {
  return /* @__PURE__ */ jsxs6(
    EmailLayout,
    {
      preview: `Update on your listing "${propertyTitle}"`,
      title: "Listing not approved",
      children: [
        /* @__PURE__ */ jsxs6(Text6, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", unfortunately your property submission was not approved at this time."
        ] }),
        /* @__PURE__ */ jsxs6(Section4, { style: highlightBox, children: [
          /* @__PURE__ */ jsx7(Text6, { style: highlightLabel, children: "Property" }),
          /* @__PURE__ */ jsx7(Text6, { style: highlightValue, children: propertyTitle })
        ] }),
        /* @__PURE__ */ jsxs6(
          Section4,
          {
            style: {
              ...highlightBox,
              borderColor: brand.gold
            },
            children: [
              /* @__PURE__ */ jsx7(Text6, { style: highlightLabel, children: "Reason" }),
              /* @__PURE__ */ jsx7(Text6, { style: { ...highlightValue, fontSize: "15px", color: brand.text }, children: reason })
            ]
          }
        ),
        /* @__PURE__ */ jsx7(Text6, { style: paragraph, children: "Please review our listing guidelines, update your submission, and try again." }),
        /* @__PURE__ */ jsx7(EmailButton, { href: resubmitUrl, children: "Resubmit Listing" }),
        /* @__PURE__ */ jsx7(Text6, { style: mutedText, children: "Need help? Contact our support team at support@propertyreply.co.uk" })
      ]
    }
  );
}
ListingRejectedEmail.PreviewProps = {
  firstName: "James",
  propertyTitle: "3-Bed Victorian Terrace \u2014 Leeds LS8",
  reason: "The discount percentage could not be verified against the stated market value. Please resubmit with supporting comparables.",
  resubmitUrl: "https://propertyreply.co.uk/app/submit"
};

// emails/NewDealAlertEmail.tsx
import { Section as Section5, Text as Text7 } from "@react-email/components";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
function NewDealAlertEmail({
  firstName,
  property
}) {
  return /* @__PURE__ */ jsxs7(
    EmailLayout,
    {
      preview: `New BMV deal: ${property.title} \u2014 ${property.discount} below market`,
      title: "New deal alert",
      children: [
        /* @__PURE__ */ jsxs7(Text7, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", a new below-market-value property matching your preferences has just been listed."
        ] }),
        /* @__PURE__ */ jsxs7(Section5, { style: highlightBox, children: [
          /* @__PURE__ */ jsx8(Text7, { style: highlightLabel, children: "Property" }),
          /* @__PURE__ */ jsx8(Text7, { style: highlightValue, children: property.title }),
          /* @__PURE__ */ jsxs7(Text7, { style: { color: brand.muted, fontSize: "14px", margin: "8px 0 0" }, children: [
            "\u{1F4CD} ",
            property.location
          ] }),
          /* @__PURE__ */ jsxs7(Text7, { style: { color: brand.text, fontSize: "15px", margin: "12px 0 0" }, children: [
            "Asking: ",
            /* @__PURE__ */ jsx8("strong", { style: { color: brand.gold }, children: property.price }),
            " \xB7 ",
            /* @__PURE__ */ jsx8("strong", { style: { color: brand.gold }, children: property.discount }),
            " below market"
          ] })
        ] }),
        /* @__PURE__ */ jsx8(EmailButton, { href: property.url, children: "View Deal" })
      ]
    }
  );
}
NewDealAlertEmail.PreviewProps = {
  firstName: "James",
  property: {
    title: "3-Bed Victorian Terrace \u2014 Leeds LS8",
    price: "\xA3142,000",
    discount: "18%",
    location: "Leeds, West Yorkshire",
    url: "https://propertyreply.co.uk/app/listings/example"
  }
};

// emails/MembershipRenewalReminderEmail.tsx
import { Section as Section6, Text as Text8 } from "@react-email/components";
import { jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
function MembershipRenewalReminderEmail({
  firstName,
  plan,
  renewalDate,
  price,
  billingUrl
}) {
  return /* @__PURE__ */ jsxs8(
    EmailLayout,
    {
      preview: `Your ${plan} membership renews on ${renewalDate}`,
      title: "Membership renewal reminder",
      children: [
        /* @__PURE__ */ jsxs8(Text8, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", your PropertyReply membership is due to renew in 7 days."
        ] }),
        /* @__PURE__ */ jsxs8(Section6, { style: highlightBox, children: [
          /* @__PURE__ */ jsx9(Text8, { style: highlightLabel, children: "Plan" }),
          /* @__PURE__ */ jsx9(Text8, { style: highlightValue, children: plan }),
          /* @__PURE__ */ jsxs8(Text8, { style: { color: "#8A9BB5", fontSize: "14px", margin: "12px 0 0" }, children: [
            "Renewal date: ",
            /* @__PURE__ */ jsx9("strong", { style: { color: "#E8EDF5" }, children: renewalDate }),
            /* @__PURE__ */ jsx9("br", {}),
            "Amount: ",
            /* @__PURE__ */ jsx9("strong", { style: { color: "#D4A843" }, children: price })
          ] })
        ] }),
        /* @__PURE__ */ jsx9(EmailButton, { href: billingUrl, children: "Manage Billing" }),
        /* @__PURE__ */ jsx9(Text8, { style: mutedText, children: "You can update your payment method or cancel anytime from your account settings. No action is needed if you wish to continue." })
      ]
    }
  );
}
MembershipRenewalReminderEmail.PreviewProps = {
  firstName: "James",
  plan: "Premium",
  renewalDate: "27 Jun 2026",
  price: "\xA329.00",
  billingUrl: "https://propertyreply.co.uk/app/profile"
};

// emails/KYCStatusEmail.tsx
import { Text as Text9 } from "@react-email/components";
import { Fragment, jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
function KYCStatusEmail({
  firstName,
  status,
  supportUrl,
  dashboardUrl
}) {
  const approved = status === "approved";
  return /* @__PURE__ */ jsx10(
    EmailLayout,
    {
      preview: approved ? "Your identity verification has been approved" : "Update on your identity verification",
      title: approved ? "Identity verified" : "Verification not approved",
      children: approved ? /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsxs9(Text9, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", great news \u2014 your identity verification has been approved. You can now submit property listings and access full seller contact details."
        ] }),
        /* @__PURE__ */ jsx10(Text9, { style: { ...paragraph, color: brand.gold, fontWeight: "600" }, children: "\u2713 KYC Approved \xB7 AML Clear" }),
        /* @__PURE__ */ jsx10(EmailButton, { href: dashboardUrl, children: "Go to Dashboard" })
      ] }) : /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsxs9(Text9, { style: paragraph, children: [
          "Hi ",
          firstName,
          ", unfortunately we were unable to verify your identity with the documents provided."
        ] }),
        /* @__PURE__ */ jsx10(Text9, { style: paragraph, children: "Please try again with a valid passport or UK driving licence, and ensure your selfie is clear and well-lit." }),
        /* @__PURE__ */ jsx10(EmailButton, { href: dashboardUrl, children: "Retry Verification" }),
        /* @__PURE__ */ jsx10(Text9, { style: mutedText, children: "Need assistance? Our support team is here to help." }),
        /* @__PURE__ */ jsx10(EmailButton, { href: supportUrl, children: "Contact Support" })
      ] })
    }
  );
}
KYCStatusEmail.PreviewProps = {
  firstName: "James",
  status: "approved",
  supportUrl: "mailto:support@propertyreply.co.uk",
  dashboardUrl: "https://propertyreply.co.uk/app/kyc"
};

// emails/AdminNewSubmissionEmail.tsx
import { Section as Section7, Text as Text10 } from "@react-email/components";
import { jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
function AdminNewSubmissionEmail({
  propertyTitle,
  submitterName,
  submitterEmail,
  reviewUrl
}) {
  return /* @__PURE__ */ jsxs10(
    EmailLayout,
    {
      preview: `New listing submitted for review: ${propertyTitle}`,
      title: "New listing awaiting review",
      children: [
        /* @__PURE__ */ jsx11(Text10, { style: paragraph, children: "A new property listing has been submitted and is waiting for admin review." }),
        /* @__PURE__ */ jsxs10(Section7, { style: highlightBox, children: [
          /* @__PURE__ */ jsx11(Text10, { style: highlightLabel, children: "Property" }),
          /* @__PURE__ */ jsx11(Text10, { style: highlightValue, children: propertyTitle }),
          /* @__PURE__ */ jsxs10(Text10, { style: { color: brand.muted, fontSize: "14px", margin: "8px 0 0" }, children: [
            "Submitted by: ",
            /* @__PURE__ */ jsx11("strong", { style: { color: brand.text }, children: submitterName })
          ] }),
          /* @__PURE__ */ jsx11(Text10, { style: { color: brand.muted, fontSize: "13px", margin: "4px 0 0" }, children: submitterEmail })
        ] }),
        /* @__PURE__ */ jsx11(EmailButton, { href: reviewUrl, children: "Review Submission" })
      ]
    }
  );
}
AdminNewSubmissionEmail.PreviewProps = {
  propertyTitle: "3-Bed Victorian Terrace \u2014 Leeds LS8",
  submitterName: "James Smith",
  submitterEmail: "james@example.com",
  reviewUrl: "https://propertyreply.co.uk/app/admin"
};

// emails/EnquiryToSellerEmail.tsx
import { Section as Section8, Text as Text11 } from "@react-email/components";
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
function EnquiryToSellerEmail({
  sellerName,
  propertyTitle,
  buyerName,
  buyerEmail,
  buyerPhone,
  message,
  inboxUrl
}) {
  return /* @__PURE__ */ jsxs11(
    EmailLayout,
    {
      preview: `New enquiry about "${propertyTitle}"`,
      title: "You've got a new enquiry",
      children: [
        /* @__PURE__ */ jsxs11(Text11, { style: paragraph, children: [
          "Hi ",
          sellerName,
          ", a verified PropertyReply investor is interested in your listing."
        ] }),
        /* @__PURE__ */ jsxs11(Section8, { style: highlightBox, children: [
          /* @__PURE__ */ jsx12(Text11, { style: highlightLabel, children: "Property" }),
          /* @__PURE__ */ jsx12(Text11, { style: highlightValue, children: propertyTitle })
        ] }),
        /* @__PURE__ */ jsxs11(Section8, { style: highlightBox, children: [
          /* @__PURE__ */ jsx12(Text11, { style: highlightLabel, children: "From" }),
          /* @__PURE__ */ jsx12(Text11, { style: { color: brand.text, fontSize: "15px", margin: "0 0 4px" }, children: buyerName }),
          /* @__PURE__ */ jsxs11(Text11, { style: { color: brand.muted, fontSize: "13px", margin: "0" }, children: [
            buyerEmail,
            " \xB7 ",
            buyerPhone
          ] })
        ] }),
        /* @__PURE__ */ jsxs11(Section8, { style: highlightBox, children: [
          /* @__PURE__ */ jsx12(Text11, { style: highlightLabel, children: "Message" }),
          /* @__PURE__ */ jsx12(
            Text11,
            {
              style: {
                color: brand.text,
                fontSize: "15px",
                margin: "0",
                whiteSpace: "pre-wrap"
              },
              children: message
            }
          )
        ] }),
        /* @__PURE__ */ jsx12(Section8, { style: { marginTop: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ jsx12("a", { href: inboxUrl, style: ctaButton, children: "Reply in Enquiries \u2192" }) }),
        /* @__PURE__ */ jsxs11(Text11, { style: mutedText, children: [
          "Prefer email? You can also reply directly to this message to reach",
          " ",
          buyerName,
          "."
        ] })
      ]
    }
  );
}
EnquiryToSellerEmail.PreviewProps = {
  sellerName: "Sarah Owens",
  propertyTitle: "3-Bed Victorian Terrace \u2014 Leeds LS8",
  buyerName: "James Smith",
  buyerEmail: "james@example.com",
  buyerPhone: "07123 456789",
  message: "Hi, I'm very interested in this property. Is it still available and could we arrange a viewing this week?",
  inboxUrl: "http://localhost:3000/app/enquiries"
};

// emails/EnquiryConfirmationEmail.tsx
import { Section as Section9, Text as Text12 } from "@react-email/components";
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
function EnquiryConfirmationEmail({
  buyerFirstName,
  propertyTitle,
  sellerName,
  inboxUrl
}) {
  return /* @__PURE__ */ jsxs12(
    EmailLayout,
    {
      preview: `Your enquiry about "${propertyTitle}" has been sent`,
      title: "Enquiry sent",
      children: [
        /* @__PURE__ */ jsxs12(Text12, { style: paragraph, children: [
          "Hi ",
          buyerFirstName,
          ', your enquiry about "',
          propertyTitle,
          '" has been sent to ',
          sellerName,
          "."
        ] }),
        /* @__PURE__ */ jsx13(Text12, { style: paragraph, children: "Track the conversation and any seller replies in your Enquiries inbox. We'll also email you when they respond on the platform." }),
        /* @__PURE__ */ jsx13(Section9, { style: { margin: "20px 0" }, children: /* @__PURE__ */ jsx13("a", { href: inboxUrl, style: ctaButton, children: "View my enquiries \u2192" }) }),
        /* @__PURE__ */ jsx13(Text12, { style: mutedText, children: "Didn't hear back within a few days? Follow up from Enquiries or contact support@propertyreply.co.uk for help." })
      ]
    }
  );
}
EnquiryConfirmationEmail.PreviewProps = {
  buyerFirstName: "James",
  propertyTitle: "3-Bed Victorian Terrace \u2014 Leeds LS8",
  sellerName: "Sarah Owens",
  inboxUrl: "http://localhost:3000/app/enquiries"
};

// emails/EnquiryReplyEmail.tsx
import { Section as Section10, Text as Text13 } from "@react-email/components";
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
function EnquiryReplyEmail({
  recipientFirstName,
  propertyTitle,
  authorName,
  message,
  inboxUrl
}) {
  return /* @__PURE__ */ jsxs13(
    EmailLayout,
    {
      preview: `${authorName} replied about "${propertyTitle}"`,
      title: "New reply on your enquiry",
      children: [
        /* @__PURE__ */ jsxs13(Text13, { style: paragraph, children: [
          "Hi ",
          recipientFirstName,
          ", ",
          authorName,
          ' replied about "',
          propertyTitle,
          '".'
        ] }),
        /* @__PURE__ */ jsxs13(Section10, { style: highlightBox, children: [
          /* @__PURE__ */ jsx14(Text13, { style: highlightLabel, children: "Reply" }),
          /* @__PURE__ */ jsx14(
            Text13,
            {
              style: {
                color: brand.text,
                fontSize: "15px",
                margin: "0",
                whiteSpace: "pre-wrap"
              },
              children: message
            }
          )
        ] }),
        /* @__PURE__ */ jsx14(Section10, { style: { marginTop: "24px" }, children: /* @__PURE__ */ jsx14("a", { href: inboxUrl, style: ctaButton, children: "Open Enquiries \u2192" }) }),
        /* @__PURE__ */ jsx14(Text13, { style: mutedText, children: "You can continue the conversation in your PropertyReply Enquiries inbox." })
      ]
    }
  );
}
EnquiryReplyEmail.PreviewProps = {
  recipientFirstName: "James",
  propertyTitle: "3-Bed Victorian Terrace \u2014 Leeds LS8",
  authorName: "Sarah Owens",
  message: "Thanks for your interest \u2014 yes it's still available. Are you free Thursday afternoon?",
  inboxUrl: "http://localhost:3000/app/enquiries"
};

// src/services/email.ts
var cachedTransporter = null;
var cachedTransporterKey = "";
function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== void 0 ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.EMAIL_FROM || user || "noreply@propertyreply.co.uk";
  return { host, port, secure, user, pass, from };
}
function getTransporter() {
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
    auth: { user, pass }
  });
  cachedTransporterKey = key;
  return cachedTransporter;
}
async function sendEmail({
  to,
  subject,
  react,
  replyTo
}) {
  const transporter = getTransporter();
  const { from } = getSmtpConfig();
  if (!transporter) {
    console.warn(`[email] SMTP_USER/SMTP_PASS not set \u2014 skipping: ${subject}`);
    return { success: false, skipped: true, error: "not_configured" };
  }
  try {
    const html = await render(react);
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...replyTo ? { replyTo } : {}
    });
    return { success: true, id: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error(`[email] Failed to send "${subject}" to ${to}:`, message);
    return { success: false, error: message };
  }
}
async function sendWelcomeEmail(to, firstName, verificationLink) {
  return sendEmail({
    to,
    subject: "Welcome to PropertyReply",
    react: WelcomeEmail({ firstName, verificationLink })
  });
}
async function sendEmailVerification(to, firstName, verificationLink) {
  return sendEmail({
    to,
    subject: "Verify your PropertyReply email",
    react: EmailVerificationEmail({ firstName, verificationLink })
  });
}
async function sendPasswordReset(to, firstName, resetLink) {
  return sendEmail({
    to,
    subject: "Reset your PropertyReply password",
    react: PasswordResetEmail({ firstName, resetLink })
  });
}
async function sendListingApproved(to, firstName, propertyTitle, listingUrl) {
  return sendEmail({
    to,
    subject: `Listing approved: ${propertyTitle}`,
    react: ListingApprovedEmail({ firstName, propertyTitle, listingUrl })
  });
}
async function sendListingRejected(to, firstName, propertyTitle, reason, resubmitUrl) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: `Listing update: ${propertyTitle}`,
    react: ListingRejectedEmail({
      firstName,
      propertyTitle,
      reason,
      resubmitUrl: resubmitUrl || `${clientUrl}/app/submit`
    })
  });
}
async function sendNewDealAlert(to, firstName, property) {
  return sendEmail({
    to,
    subject: `New deal: ${property.title}`,
    react: NewDealAlertEmail({ firstName, property })
  });
}
async function sendMembershipReminder(to, firstName, plan, renewalDate, price, billingUrl) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: `Your ${plan} membership renews in 7 days`,
    react: MembershipRenewalReminderEmail({
      firstName,
      plan,
      renewalDate,
      price,
      billingUrl: billingUrl || `${clientUrl}/app/profile`
    })
  });
}
async function sendKYCStatus(to, firstName, status) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: status === "approved" ? "Identity verification approved" : "Identity verification update",
    react: KYCStatusEmail({
      firstName,
      status,
      supportUrl: "mailto:support@propertyreply.co.uk",
      dashboardUrl: `${clientUrl}/app/kyc`
    })
  });
}
async function sendAdminNewSubmission(to, propertyTitle, submitterName, submitterEmail, reviewUrl) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return sendEmail({
    to,
    subject: `New listing submitted: ${propertyTitle}`,
    react: AdminNewSubmissionEmail({
      propertyTitle,
      submitterName,
      submitterEmail,
      reviewUrl: reviewUrl || `${clientUrl}/app/admin`
    })
  });
}
async function sendEnquiryToSeller(to, sellerName, propertyTitle, buyerName, buyerEmail, buyerPhone, message, inboxUrl) {
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
      inboxUrl: inboxUrl || `${process.env.CLIENT_URL || "http://localhost:3000"}/app/enquiries`
    }),
    replyTo: buyerEmail
  });
}
async function sendEnquiryConfirmation(to, buyerFirstName, propertyTitle, sellerName, inboxUrl) {
  return sendEmail({
    to,
    subject: `Your enquiry about "${propertyTitle}" has been sent`,
    react: EnquiryConfirmationEmail({
      buyerFirstName,
      propertyTitle,
      sellerName,
      inboxUrl: inboxUrl || `${process.env.CLIENT_URL || "http://localhost:3000"}/app/enquiries`
    })
  });
}
async function sendEnquiryReply(to, recipientFirstName, propertyTitle, authorName, message, inboxUrl) {
  return sendEmail({
    to,
    subject: `New reply about "${propertyTitle}"`,
    react: EnquiryReplyEmail({
      recipientFirstName,
      propertyTitle,
      authorName,
      message,
      inboxUrl
    })
  });
}
function queueEmail(task, label) {
  task().catch((err) => {
    console.error(`[email] Background task failed (${label}):`, err);
  });
}
var emailService = {
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
  queueEmail
};
export {
  emailService,
  queueEmail,
  sendAdminNewSubmission,
  sendEmailVerification,
  sendEnquiryConfirmation,
  sendEnquiryReply,
  sendEnquiryToSeller,
  sendKYCStatus,
  sendListingApproved,
  sendListingRejected,
  sendMembershipReminder,
  sendNewDealAlert,
  sendPasswordReset,
  sendWelcomeEmail
};
