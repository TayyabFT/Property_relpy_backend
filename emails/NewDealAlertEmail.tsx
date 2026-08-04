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

type NewDealAlertEmailProps = {
  firstName: string;
  property: {
    title: string;
    price: string;
    discount: string;
    location: string;
    url: string;
  };
};

export default function NewDealAlertEmail({
  firstName,
  property,
}: NewDealAlertEmailProps) {
  return (
    <EmailLayout
      preview={`New BMV deal: ${property.title} — ${property.discount} below market`}
      title="New deal alert"
    >
      <Text style={paragraph}>
        Hi {firstName}, a new below-market-value property matching your
        preferences has just been listed.
      </Text>
      <Section style={highlightBox}>
        <Text style={highlightLabel}>Property</Text>
        <Text style={highlightValue}>{property.title}</Text>
        <Text style={{ color: brand.muted, fontSize: "14px", margin: "8px 0 0" }}>
          📍 {property.location}
        </Text>
        <Text style={{ color: brand.text, fontSize: "15px", margin: "12px 0 0" }}>
          Asking: <strong style={{ color: brand.gold }}>{property.price}</strong>
          {" · "}
          <strong style={{ color: brand.gold }}>{property.discount}</strong> below
          market
        </Text>
      </Section>
      <EmailButton href={property.url}>View Deal</EmailButton>
    </EmailLayout>
  );
}

NewDealAlertEmail.PreviewProps = {
  firstName: "James",
  property: {
    title: "3-Bed Victorian Terrace — Leeds LS8",
    price: "£142,000",
    discount: "18%",
    location: "Leeds, West Yorkshire",
    url: "https://propertyreply.co.uk/app/listings/example",
  },
} satisfies NewDealAlertEmailProps;
