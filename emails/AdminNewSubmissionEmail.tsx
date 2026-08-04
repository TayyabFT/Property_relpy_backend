import { Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import {
  EmailLayout,
  paragraph,
  highlightBox,
  highlightLabel,
  highlightValue,
  brand,
} from "./components/EmailLayout";

type AdminNewSubmissionEmailProps = {
  propertyTitle: string;
  submitterName: string;
  submitterEmail: string;
  reviewUrl: string;
};

export default function AdminNewSubmissionEmail({
  propertyTitle,
  submitterName,
  submitterEmail,
  reviewUrl,
}: AdminNewSubmissionEmailProps) {
  return (
    <EmailLayout
      preview={`New listing submitted for review: ${propertyTitle}`}
      title="New listing awaiting review"
    >
      <Text style={paragraph}>
        A new property listing has been submitted and is waiting for admin
        review.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Property</Text>
        <Text style={highlightValue}>{propertyTitle}</Text>
        <Text style={{ color: brand.muted, fontSize: "14px", margin: "8px 0 0" }}>
          Submitted by: <strong style={{ color: brand.text }}>{submitterName}</strong>
        </Text>
        <Text style={{ color: brand.muted, fontSize: "13px", margin: "4px 0 0" }}>
          {submitterEmail}
        </Text>
      </Section>
      <EmailButton href={reviewUrl}>Review Submission</EmailButton>
    </EmailLayout>
  );
}

AdminNewSubmissionEmail.PreviewProps = {
  propertyTitle: "3-Bed Victorian Terrace — Leeds LS8",
  submitterName: "James Smith",
  submitterEmail: "james@example.com",
  reviewUrl: "https://propertyreply.co.uk/app/admin",
} satisfies AdminNewSubmissionEmailProps;
