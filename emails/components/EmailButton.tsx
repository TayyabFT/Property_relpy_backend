import { Button } from "@react-email/components";
import { brand } from "./EmailLayout";

type EmailButtonProps = {
  href: string;
  children: string;
};

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  );
}

const button = {
  backgroundColor: brand.gold,
  borderRadius: "8px",
  color: brand.navy,
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: "1",
  padding: "14px 28px",
  textDecoration: "none",
  textAlign: "center" as const,
  margin: "8px 0 20px",
};
