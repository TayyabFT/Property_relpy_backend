import { Section, Text } from "@react-email/components";
import {
  EmailLayout,
  paragraph,
  mutedText,
  ctaButton,
} from "./components/EmailLayout";

type EnquiryConfirmationEmailProps = {
  buyerFirstName: string;
  propertyTitle: string;
  sellerName: string;
  inboxUrl: string;
};

export default function EnquiryConfirmationEmail({
  buyerFirstName,
  propertyTitle,
  sellerName,
  inboxUrl,
}: EnquiryConfirmationEmailProps) {
  return (
    <EmailLayout
      preview={`Your enquiry about "${propertyTitle}" has been sent`}
      title="Enquiry sent"
    >
      <Text style={paragraph}>
        Hi {buyerFirstName}, your enquiry about &quot;{propertyTitle}&quot;
        has been sent to {sellerName}.
      </Text>
      <Text style={paragraph}>
        Track the conversation and any seller replies in your Enquiries inbox.
        We&apos;ll also email you when they respond on the platform.
      </Text>
      <Section style={{ margin: "20px 0" }}>
        <a href={inboxUrl} style={ctaButton}>
          View my enquiries →
        </a>
      </Section>
      <Text style={mutedText}>
        Didn&apos;t hear back within a few days? Follow up from Enquiries or
        contact support@propertyreply.co.uk for help.
      </Text>
    </EmailLayout>
  );
}

EnquiryConfirmationEmail.PreviewProps = {
  buyerFirstName: "James",
  propertyTitle: "3-Bed Victorian Terrace — Leeds LS8",
  sellerName: "Sarah Owens",
  inboxUrl: "http://localhost:3000/app/enquiries",
} satisfies EnquiryConfirmationEmailProps;
