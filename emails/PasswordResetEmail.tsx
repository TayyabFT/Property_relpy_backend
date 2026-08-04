import { Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailLayout, paragraph, mutedText, brand } from "./components/EmailLayout";

type PasswordResetEmailProps = {
  firstName: string;
  resetLink: string;
};

export default function PasswordResetEmail({
  firstName,
  resetLink,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Reset your PropertyReply password"
      title="Reset your password"
    >
      <Text style={paragraph}>
        Hi {firstName}, we received a request to reset your PropertyReply
        password.
      </Text>
      <EmailButton href={resetLink}>Reset Password</EmailButton>
      <Text style={mutedText}>This link expires in 1 hour.</Text>
      <Text
        style={{
          ...mutedText,
          color: brand.gold,
          marginTop: "20px",
        }}
      >
        If you didn&apos;t request a password reset, please ignore this email.
        Your password will remain unchanged. Contact support if you&apos;re
        concerned about your account security.
      </Text>
    </EmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  firstName: "James",
  resetLink: "https://propertyreply.co.uk/reset-password?token=example",
} satisfies PasswordResetEmailProps;
