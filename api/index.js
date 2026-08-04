// Register tsx so Express route modules can import email.ts + React Email .tsx templates.
import { register } from "tsx/esm/api";

register();

const { default: handler } = await import("../src/vercel-handler.js");

// Required so Stripe webhook signature verification receives the raw body.
// externalResolver: Express finishes the response itself.
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default handler;
