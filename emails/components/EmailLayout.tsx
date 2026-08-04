import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export const brand = {
  navy: "#0B1628",
  navyLight: "#132238",
  gold: "#D4A843",
  goldDark: "#B8922F",
  text: "#E8EDF5",
  muted: "#8A9BB5",
  border: "#1E3354",
};

type EmailLayoutProps = {
  preview: string;
  title: string;
  children: ReactNode;
};

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PropertyReply</Text>
            <Text style={tagline}>UK Below-Market Property Marketplace</Text>
          </Section>

          <Section style={card}>
            <Heading style={heading}>{title}</Heading>
            {children}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} PropertyReply. All rights reserved.
            <br />
            <Link href="https://propertyreply.co.uk" style={footerLink}>
              propertyreply.co.uk
            </Link>
            {" · "}
            <Link href="mailto:support@propertyreply.co.uk" style={footerLink}>
              support@propertyreply.co.uk
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: brand.navy,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "32px 16px",
};

const container = {
  margin: "0 auto",
  maxWidth: "560px",
};

const header = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const logo = {
  color: brand.gold,
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const tagline = {
  color: brand.muted,
  fontSize: "12px",
  margin: "0",
  textTransform: "uppercase" as const,
  letterSpacing: "1.5px",
};

const card = {
  backgroundColor: brand.navyLight,
  border: `1px solid ${brand.border}`,
  borderRadius: "12px",
  padding: "32px 28px",
};

const heading = {
  color: brand.text,
  fontSize: "22px",
  fontWeight: "600",
  lineHeight: "1.35",
  margin: "0 0 20px",
};

const hr = {
  borderColor: brand.border,
  margin: "28px 0 16px",
};

const footer = {
  color: brand.muted,
  fontSize: "12px",
  lineHeight: "1.6",
  textAlign: "center" as const,
};

const footerLink = {
  color: brand.gold,
  textDecoration: "none",
};

export const paragraph = {
  color: brand.text,
  fontSize: "15px",
  lineHeight: "1.65",
  margin: "0 0 16px",
};

export const mutedText = {
  color: brand.muted,
  fontSize: "13px",
  lineHeight: "1.55",
  margin: "16px 0 0",
};

export const highlightBox = {
  backgroundColor: brand.navy,
  border: `1px solid ${brand.border}`,
  borderRadius: "8px",
  padding: "16px 18px",
  margin: "20px 0",
};

export const highlightLabel = {
  color: brand.muted,
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px",
};

export const highlightValue = {
  color: brand.gold,
  fontSize: "18px",
  fontWeight: "600",
  margin: "0",
};

export const ctaButton = {
  backgroundColor: brand.gold,
  color: brand.navy,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "12px 20px",
  borderRadius: "8px",
  textDecoration: "none",
};
