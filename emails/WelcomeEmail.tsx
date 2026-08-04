import { Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailLayout, paragraph, mutedText } from "./components/EmailLayout";

type WelcomeEmailProps = {
  firstName: string;
  verificationLink: string;
};

export default function WelcomeEmail({
  firstName,
  verificationLink,
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview={`Welcome to PropertyReply, ${firstName}!`}
      title={`Welcome, ${firstName}!`}
    >
      <Text style={paragraph}>
        Thanks for joining PropertyReply — the UK&apos;s marketplace for
        verified below-market-value property deals.
      </Text>
      <Text style={paragraph}>
        Browse curated BMV listings, run full deal analysis, and connect with
        verified sellers. To get started, please verify your email address.
      </Text>
      <EmailButton href={verificationLink}>Verify Email Address</EmailButton>
      <Text style={mutedText}>
        You can also complete identity verification (KYC) from your dashboard to
        unlock listing submission and seller contact details.
      </Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: "James",
  verificationLink: "https://propertyreply.co.uk/verify-email?token=example",
} satisfies WelcomeEmailProps;
