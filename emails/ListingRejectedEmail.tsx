import { Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import {
  EmailLayout,
  paragraph,
  mutedText,
  highlightBox,
  highlightLabel,
  highlightValue,
  brand,
} from "./components/EmailLayout";

type ListingRejectedEmailProps = {
  firstName: string;
  propertyTitle: string;
  reason: string;
  resubmitUrl: string;
};

export default function ListingRejectedEmail({
  firstName,
  propertyTitle,
  reason,
  resubmitUrl,
}: ListingRejectedEmailProps) {
  return (
    <EmailLayout
      preview={`Update on your listing "${propertyTitle}"`}
      title="Listing not approved"
    >
      <Text style={paragraph}>
        Hi {firstName}, unfortunately your property submission was not approved
        at this time.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Property</Text>
        <Text style={highlightValue}>{propertyTitle}</Text>
      </Section>
      <Section
        style={{
          ...highlightBox,
          borderColor: brand.gold,
        }}
      >
        <Text style={highlightLabel}>Reason</Text>
        <Text style={{ ...highlightValue, fontSize: "15px", color: brand.text }}>
          {reason}
        </Text>
      </Section>
      <Text style={paragraph}>
        Please review our listing guidelines, update your submission, and try
        again.
      </Text>
      <EmailButton href={resubmitUrl}>Resubmit Listing</EmailButton>
      <Text style={mutedText}>
        Need help? Contact our support team at support@propertyreply.co.uk
      </Text>
    </EmailLayout>
  );
}

ListingRejectedEmail.PreviewProps = {
  firstName: "James",
  propertyTitle: "3-Bed Victorian Terrace — Leeds LS8",
  reason:
    "The discount percentage could not be verified against the stated market value. Please resubmit with supporting comparables.",
  resubmitUrl: "https://propertyreply.co.uk/app/submit",
} satisfies ListingRejectedEmailProps;
