import { Section, Text } from "@react-email/components";
import {
  EmailLayout,
  paragraph,
  mutedText,
  highlightBox,
  highlightLabel,
  highlightValue,
  brand,
  ctaButton,
} from "./components/EmailLayout";

type EnquiryToSellerEmailProps = {
  sellerName: string;
  propertyTitle: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  message: string;
  inboxUrl: string;
};

export default function EnquiryToSellerEmail({
  sellerName,
  propertyTitle,
  buyerName,
  buyerEmail,
  buyerPhone,
  message,
  inboxUrl,
}: EnquiryToSellerEmailProps) {
  return (
    <EmailLayout
      preview={`New enquiry about "${propertyTitle}"`}
      title="You've got a new enquiry"
    >
      <Text style={paragraph}>
        Hi {sellerName}, a verified PropertyReply investor is interested in
        your listing.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Property</Text>
        <Text style={highlightValue}>{propertyTitle}</Text>
      </Section>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>From</Text>
        <Text style={{ color: brand.text, fontSize: "15px", margin: "0 0 4px" }}>
          {buyerName}
        </Text>
        <Text style={{ color: brand.muted, fontSize: "13px", margin: "0" }}>
          {buyerEmail} · {buyerPhone}
        </Text>
      </Section>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Message</Text>
        <Text
          style={{
            color: brand.text,
            fontSize: "15px",
            margin: "0",
            whiteSpace: "pre-wrap" as const,
          }}
        >
          {message}
        </Text>
      </Section>
      <Section style={{ marginTop: "8px", marginBottom: "8px" }}>
        <a href={inboxUrl} style={ctaButton}>
          Reply in Enquiries →
        </a>
      </Section>
      <Text style={mutedText}>
        Prefer email? You can also reply directly to this message to reach{" "}
        {buyerName}.
      </Text>
    </EmailLayout>
  );
}

EnquiryToSellerEmail.PreviewProps = {
  sellerName: "Sarah Owens",
  propertyTitle: "3-Bed Victorian Terrace — Leeds LS8",
  buyerName: "James Smith",
  buyerEmail: "james@example.com",
  buyerPhone: "07123 456789",
  message:
    "Hi, I'm very interested in this property. Is it still available and could we arrange a viewing this week?",
  inboxUrl: "http://localhost:3000/app/enquiries",
} satisfies EnquiryToSellerEmailProps;
