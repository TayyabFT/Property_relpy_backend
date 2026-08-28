import { Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import {
  EmailLayout,
  paragraph,
  highlightBox,
  highlightLabel,
  highlightValue,
} from "./components/EmailLayout";

type ListingApprovedEmailProps = {
  firstName: string;
  propertyTitle: string;
  listingUrl: string;
};

export default function ListingApprovedEmail({
  firstName,
  propertyTitle,
  listingUrl,
}: ListingApprovedEmailProps) {
  return (
    <EmailLayout
      preview={`Your listing "${propertyTitle}" is now live!`}
      title="Listing approved — congratulations!"
    >
      <Text style={paragraph}>
        Great news, {firstName}! Your property listing has been reviewed and
        approved by our team.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Property</Text>
        <Text style={highlightValue}>{propertyTitle}</Text>
      </Section>
      <Text style={paragraph}>
        Your listing is now live on the PropertyReply marketplace and visible
        to UK property investors.
      </Text>
      <EmailButton href={listingUrl}>View Live Listing</EmailButton>
    </EmailLayout>
  );
}

ListingApprovedEmail.PreviewProps = {
  firstName: "James",
  propertyTitle: "3-Bed Victorian Terrace — Leeds LS8",
  listingUrl: "https://propertyreply.co.uk/app/listings/example",
} satisfies ListingApprovedEmailProps;
