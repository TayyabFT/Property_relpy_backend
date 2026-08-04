import { Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import {
  EmailLayout,
  paragraph,
  mutedText,
  brand,
} from "./components/EmailLayout";

type KYCStatusEmailProps = {
  firstName: string;
  status: "approved" | "rejected";
  supportUrl: string;
  dashboardUrl: string;
};

export default function KYCStatusEmail({
  firstName,
  status,
  supportUrl,
  dashboardUrl,
}: KYCStatusEmailProps) {
  const approved = status === "approved";

  return (
    <EmailLayout
      preview={
        approved
          ? "Your identity verification has been approved"
          : "Update on your identity verification"
      }
      title={approved ? "Identity verified" : "Verification not approved"}
    >
      {approved ? (
        <>
          <Text style={paragraph}>
            Hi {firstName}, great news — your identity verification has been
            approved. You can now submit property listings and access full seller
            contact details.
          </Text>
          <Text style={{ ...paragraph, color: brand.gold, fontWeight: "600" }}>
            ✓ KYC Approved · AML Clear
          </Text>
          <EmailButton href={dashboardUrl}>Go to Dashboard</EmailButton>
        </>
      ) : (
        <>
          <Text style={paragraph}>
            Hi {firstName}, unfortunately we were unable to verify your identity
            with the documents provided.
          </Text>
          <Text style={paragraph}>
            Please try again with a valid passport or UK driving licence, and
            ensure your selfie is clear and well-lit.
          </Text>
          <EmailButton href={dashboardUrl}>Retry Verification</EmailButton>
          <Text style={mutedText}>
            Need assistance? Our support team is here to help.
          </Text>
          <EmailButton href={supportUrl}>Contact Support</EmailButton>
        </>
      )}
    </EmailLayout>
  );
}

KYCStatusEmail.PreviewProps = {
  firstName: "James",
  status: "approved",
  supportUrl: "mailto:support@propertyreply.co.uk",
  dashboardUrl: "https://propertyreply.co.uk/app/kyc",
} satisfies KYCStatusEmailProps;
