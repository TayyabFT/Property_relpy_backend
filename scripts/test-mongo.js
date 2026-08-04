import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

dns.setDefaultResultOrder("ipv4first");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing in .env");
  process.exit(1);
}

console.log("Connecting to Atlas...");
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log("MongoDB Atlas connected OK");
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error("CONNECT FAILED:", err.message);
  if (/IP|whitelist|not authorized|authentication/i.test(err.message)) {
    console.error(
      "\nTip: In Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for testing).",
    );
  }
  process.exit(1);
}
