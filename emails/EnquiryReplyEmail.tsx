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

type EnquiryReplyEmailProps = {
  recipientFirstName: string;
  propertyTitle: string;
  authorName: string;
  message: string;
  inboxUrl: string;
};

export default function EnquiryReplyEmail({
  recipientFirstName,
  propertyTitle,
  authorName,
  message,
  inboxUrl,
}: EnquiryReplyEmailProps) {
  return (
    <EmailLayout
      preview={`${authorName} replied about "${propertyTitle}"`}
      title="New reply on your enquiry"
    >
      <Text style={paragraph}>
        Hi {recipientFirstName}, {authorName} replied about &quot;{propertyTitle}
        &quot;.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Reply</Text>
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
      <Section style={{ marginTop: "24px" }}>
        <a href={inboxUrl} style={ctaButton}>
          Open Enquiries →
        </a>
      </Section>
      <Text style={mutedText}>
        You can continue the conversation in your PropertyReply Enquiries inbox.
      </Text>
    </EmailLayout>
  );
}

EnquiryReplyEmail.PreviewProps = {
  recipientFirstName: "James",
  propertyTitle: "3-Bed Victorian Terrace — Leeds LS8",
  authorName: "Sarah Owens",
  message: "Thanks for your interest — yes it's still available. Are you free Thursday afternoon?",
  inboxUrl: "http://localhost:3000/app/enquiries",
} satisfies EnquiryReplyEmailProps;
