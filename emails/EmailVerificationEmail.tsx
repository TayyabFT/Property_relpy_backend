import { Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailLayout, paragraph, mutedText } from "./components/EmailLayout";

type EmailVerificationEmailProps = {
  firstName: string;
  verificationLink: string;
};

export default function EmailVerificationEmail({
  firstName,
  verificationLink,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verify your PropertyReply email address"
      title="Verify your email"
    >
      <Text style={paragraph}>
        Hi {firstName}, please confirm your email address to activate your
        PropertyReply account.
      </Text>
      <EmailButton href={verificationLink}>Verify Email</EmailButton>
      <Text style={mutedText}>
        This link expires in 24 hours. If you didn&apos;t create an account,
        you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

EmailVerificationEmail.PreviewProps = {
  firstName: "James",
  verificationLink: "https://propertyreply.co.uk/verify-email?token=example",
} satisfies EmailVerificationEmailProps;
