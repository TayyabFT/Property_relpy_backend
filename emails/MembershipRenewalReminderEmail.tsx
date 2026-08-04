import { Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import {
  EmailLayout,
  paragraph,
  mutedText,
  highlightBox,
  highlightLabel,
  highlightValue,
} from "./components/EmailLayout";

type MembershipRenewalReminderEmailProps = {
  firstName: string;
  plan: string;
  renewalDate: string;
  price: string;
  billingUrl: string;
};

export default function MembershipRenewalReminderEmail({
  firstName,
  plan,
  renewalDate,
  price,
  billingUrl,
}: MembershipRenewalReminderEmailProps) {
  return (
    <EmailLayout
      preview={`Your ${plan} membership renews on ${renewalDate}`}
      title="Membership renewal reminder"
    >
      <Text style={paragraph}>
        Hi {firstName}, your PropertyReply membership is due to renew in 7 days.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Plan</Text>
        <Text style={highlightValue}>{plan}</Text>
        <Text style={{ color: "#8A9BB5", fontSize: "14px", margin: "12px 0 0" }}>
          Renewal date: <strong style={{ color: "#E8EDF5" }}>{renewalDate}</strong>
          <br />
          Amount: <strong style={{ color: "#D4A843" }}>{price}</strong>
        </Text>
      </Section>
      <EmailButton href={billingUrl}>Manage Billing</EmailButton>
      <Text style={mutedText}>
        You can update your payment method or cancel anytime from your account
        settings. No action is needed if you wish to continue.
      </Text>
    </EmailLayout>
  );
}

MembershipRenewalReminderEmail.PreviewProps = {
  firstName: "James",
  plan: "Premium",
  renewalDate: "27 Jun 2026",
  price: "£29.00",
  billingUrl: "https://propertyreply.co.uk/app/profile",
} satisfies MembershipRenewalReminderEmailProps;
