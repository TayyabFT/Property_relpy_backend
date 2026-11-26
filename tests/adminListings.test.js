import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Never connect to configured databases, Stripe, or email services during these tests.
Object.assign(process.env, {
  NODE_ENV: "production", JWT_SECRET: "isolated-admin-listing-tests", MONGODB_URI: "",
  STRIPE_SECRET_KEY: "", SMTP_USER: "", SMTP_PASS: "",
  CLIENT_URL: "http://localhost:3000",
  MONGOMS_DOWNLOAD_DIR: resolve("node_modules/.cache/mongodb-memory-server"),
  MONGOMS_RUNTIME_DOWNLOAD: "false",
});
const { createApp } = await import("../src/app.js");
const { User } = await import("../src/modules/auth/auth.model.js");
const { Listing } = await import("../src/modules/listings/listing.model.js");
const { DealAnalysis } = await import("../src/modules/dealAnalysis/dealAnalysis.model.js");

let db, server, base, admin, seller, listing;
before(async () => {
  db = await MongoMemoryReplSet.create({ binary: { version: "7.0.24" }, instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1 } });
  await mongoose.connect(db.getUri("admin-listing-tests"));
  admin = await User.create({ firstName: "Admin", lastName: "Test", email: "admin@example.test", password: "Test-Password-123", role: "admin" });
  seller = await User.create({ firstName: "Sara", lastName: "Seller", email: "sara@example.test", password: "Test-Password-123", plan: "Premium" });
  listing = await Listing.create({
    title: "3 Bed Terrace", location: "Leeds", locationSearch: "leeds", postcode: "LS1 1AA", propertyType: "House",
    bedrooms: 3, askingPrice: 120000, marketValue: 150000, discountPercent: 20, yieldPercent: 7.5,
    strategies: ["Flip"], tags: [{ label: "BMV" }], description: "Full description here", sellerName: "Sara S",
    submittedBy: seller._id,
  });
  await DealAnalysis.create({ listingId: listing._id, address: "1 Road", estimatedSalePrice: 160000, contact: { name: "Sara", phone: "0700", email: "sara@example.test", role: "Owner" } });
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) await new Promise((done) => server.close(done));
  await mongoose.disconnect();
  if (db) await db.stop();
});

async function call(path, user) {
  const headers = { Authorization: `Bearer ${jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET)}` };
  const res = await fetch(`${base}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

test("admins can open the full details of a live listing", async () => {
  const res = await call(`/admin/listings/${listing._id}`, admin);
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.title, "3 Bed Terrace");
  assert.equal(data.description, "Full description here");
  assert.equal(data.askingPrice, "£120,000");
  assert.equal(data.discountPercent, 20);
  assert.equal(data.status, "live");
  assert.deepEqual(data.submittedBy, { id: String(seller._id), name: "Sara Seller", email: "sara@example.test", plan: "Premium" });
  assert.equal(data.contact.phone, "0700");
});

test("sold listings can still be opened, and non-admins are refused", async () => {
  await Listing.updateOne({ _id: listing._id }, { status: "sold", salePrice: 118000, soldAt: new Date() });
  const res = await call(`/admin/listings/${listing._id}`, admin);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, "sold");
  assert.equal(res.body.data.salePrice, "£118,000");

  assert.equal((await call(`/admin/listings/${listing._id}`, seller)).status, 403);
  assert.equal((await call(`/admin/listings/${new mongoose.Types.ObjectId()}`, admin)).status, 404);
});
