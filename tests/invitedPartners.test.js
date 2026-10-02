import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { isInvitedPartner, partnerOfferEndsAt, partnerListingsHidden } from "../src/utils/invitedPartnerAccess.js";
import { cancelSubscriptionForOffer, issueSaleFeeInvoice } from "../src/services/partnerBilling.js";

// Never connect to configured databases, Stripe, or email services during these tests.
Object.assign(process.env, {
  NODE_ENV: "production", JWT_SECRET: "isolated-partner-tests", MONGODB_URI: "",
  STRIPE_SECRET_KEY: "", SMTP_USER: "", SMTP_PASS: "",
  CLIENT_URL: "http://localhost:3000",
  MONGOMS_DOWNLOAD_DIR: resolve("node_modules/.cache/mongodb-memory-server"),
  MONGOMS_RUNTIME_DOWNLOAD: "false",
});
const { createApp } = await import("../src/app.js");
const { User } = await import("../src/modules/auth/auth.model.js");
const { PartnerInvite } = await import("../src/modules/invitedPartners/partnerInvite.model.js");
const { partnerInviteService } = await import("../src/modules/invitedPartners/partnerInvite.service.js");
const { Listing } = await import("../src/modules/listings/listing.model.js");
const { Submission } = await import("../src/modules/overview/submission.model.js");
const { billingService } = await import("../src/modules/billing/billing.service.js");
const { emailService } = await import("../src/services/email.js");
const { getSuccessFeeRate, hasPaidSubscription, canStartFreeTrial } = await import("../src/utils/planAccess.js");

let db, server, base, admin, buyer;
const cancelled = [];
let cancellationFailure = false;
const originalCancel = billingService.cancelForPartnerOffer;
const originalInvoice = billingService.createSaleCommissionInvoice;
const originalQueue = emailService.queueEmail;
before(async () => {
  db = await MongoMemoryReplSet.create({ binary: { version: "7.0.24" }, instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1 } });
  await mongoose.connect(db.getUri("invited-partner-tests"));
  await Promise.all([User.init(), PartnerInvite.init(), Listing.init()]);
  billingService.cancelForPartnerOffer = async (user) => {
    if (cancellationFailure) throw new Error("Simulated Stripe outage");
    cancelled.push(user.stripeSubscriptionId);
  };
  billingService.createSaleCommissionInvoice = async (user, listing, amount, options) => {
    assert.equal(options.basisLabel, "sale price");
    return { commissionGBP: amount * getSuccessFeeRate(user), stripeInvoiceId: `test-${listing._id}`, rate: getSuccessFeeRate(user) };
  };
  emailService.queueEmail = () => {};
  admin = await member("admin", { role: "admin" });
  buyer = await member("buyer", { plan: "Premium", subscriptionStatus: "active", stripeSubscriptionId: "test-buyer" });
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  billingService.cancelForPartnerOffer = originalCancel;
  billingService.createSaleCommissionInvoice = originalInvoice;
  emailService.queueEmail = originalQueue;
  if (server) await new Promise((done) => server.close(done));
  await mongoose.disconnect();
  if (db) await db.stop();
});

async function member(name, fields = {}) {
  return User.create({ firstName: name, lastName: "Test", email: `${name}@example.test`, password: "Test-Password-123", kycStatus: "approved", ...fields });
}
async function call(path, user, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  if (user) headers.Authorization = `Bearer ${jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET)}`;
  const res = await fetch(`${base}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json() };
}
async function invite(user) {
  const res = await call("/partner-invites", admin, "POST", { email: user.email });
  assert.equal(res.status, 201);
  return res.body.data;
}
const listingPayload = {
  title: "Partner property", description: "Test property", propertyType: "House – Terraced", bedrooms: "3",
  postcode: "M1 1AA", town: "Manchester", askingPrice: 400000, marketValue: 500000,
  strategies: ["Buy-to-Let"], contact: { name: "Seller", role: "Property Owner", phone: "01234567890", email: "seller@example.test" },
};

test("two calendar months clamp month-end and expire at the exact boundary", () => {
  assert.equal(partnerOfferEndsAt(new Date("2026-12-31T12:30:00Z")).toISOString(), "2027-02-28T12:30:00.000Z");
  assert.equal(partnerOfferEndsAt(new Date("2027-12-31T12:30:00Z")).toISOString(), "2028-02-29T12:30:00.000Z");
  const user = { plan: "InvitedPartner", subscriptionStatus: "active", invitedPartnerEndsAt: new Date("2026-12-02T10:00:00Z") };
  assert.equal(isInvitedPartner(user, new Date("2026-12-02T09:59:59Z")), true);
  assert.equal(isInvitedPartner(user, user.invitedPartnerEndsAt), false);
  assert.equal(partnerListingsHidden(user, user.invitedPartnerEndsAt), true);
});

test("Stripe cancellation is immediate without proration; cancelled subscriptions are safe to retry", async () => {
  let status = "active";
  const calls = [];
  const client = { subscriptions: {
    retrieve: async (id) => ({ id, status }),
    cancel: async (id, options) => { calls.push({ id, options }); status = "canceled"; },
  } };
  await cancelSubscriptionForOffer(client, "sub-test");
  await cancelSubscriptionForOffer(client, "sub-test");
  assert.deepEqual(calls, [{ id: "sub-test", options: { prorate: false, invoice_now: false } }]);
});

test("sale fee is attached to its invoice before finalizing and sending, at 5% and 10%", async () => {
  for (const rate of [0.05, 0.1]) {
    const steps = [];
    let item;
    const client = {
      invoices: {
        create: async (options) => { steps.push("create"); assert.equal(options.auto_advance, false); return { id: "invoice-test" }; },
        finalizeInvoice: async (id) => { assert.equal(id, "invoice-test"); steps.push("finalize"); },
        sendInvoice: async (id) => { assert.equal(id, "invoice-test"); steps.push("send"); },
      },
      invoiceItems: { create: async (options) => { item = options; steps.push("item"); } },
    };
    const result = await issueSaleFeeInvoice(client, "customer-test", { title: "Property" }, 500000, rate, "sale price");
    assert.equal(item.invoice, "invoice-test");
    assert.equal(item.amount, 500000 * rate * 100);
    assert.equal(result.commissionGBP, 500000 * rate);
    assert.deepEqual(steps, ["create", "item", "finalize", "send"]);
  }
});

test("only admins manage invites; email lock, expiry, revocation and input validation are enforced", async () => {
  const recipient = await member("recipient");
  assert.equal((await call("/partner-invites", null)).status, 401);
  assert.equal((await call("/partner-invites", recipient)).status, 403);
  assert.equal((await call("/partner-invites", recipient, "POST", { email: recipient.email })).status, 403);
  assert.equal((await call("/partner-invites", admin, "POST", { email: "invalid" })).status, 400);
  assert.equal((await call("/partner-invites", admin, "POST", { email: recipient.email, daysValid: -2 })).status, 400);
  const invitation = await invite(recipient);
  assert.equal((await call("/partner-invites/accept", buyer, "POST", { code: invitation.code })).status, 403);
  assert.equal((await call(`/partner-invites/${invitation.id}/revoke`, admin, "POST")).status, 200);
  assert.equal((await call("/partner-invites/accept", recipient, "POST", { code: invitation.code })).status, 409);
  const expired = await invite(recipient);
  await PartnerInvite.findByIdAndUpdate(expired.id, { expiresAt: new Date(0) });
  assert.equal((await call("/partner-invites/accept", recipient, "POST", { code: expired.code })).status, 409);
});

test("existing paid user acknowledges cancellation; failures leave offer unused; acceptance is idempotent", async () => {
  const seller = await member("paid-seller", { plan: "Premium", subscriptionStatus: "active", stripeSubscriptionId: "test-old-sub" });
  const invitation = await invite(seller);
  assert.equal((await call("/partner-invites/accept", seller, "POST", { code: invitation.code })).status, 400);
  assert.equal(cancelled.length, 0);
  cancellationFailure = true;
  assert.equal((await call("/partner-invites/accept", seller, "POST", { code: invitation.code, acknowledgeCancellation: true })).status, 500);
  assert.equal((await PartnerInvite.findById(invitation.id)).status, "active");
  assert.equal((await User.findById(seller._id)).plan, "Premium");
  cancellationFailure = false;
  const accepted = await call("/partner-invites/accept", seller, "POST", { code: invitation.code, acknowledgeCancellation: true });
  assert.equal(accepted.status, 200);
  assert.deepEqual(cancelled, ["test-old-sub"]);
  assert.equal(accepted.body.data.user.onInvitedPartner, true);
  assert.equal(accepted.body.data.user.hasBillingSubscription, false);
  const again = await call("/partner-invites/accept", seller, "POST", { code: invitation.code, acknowledgeCancellation: true });
  assert.equal(again.body.data.user.invitedPartnerEndsAt, accepted.body.data.user.invitedPartnerEndsAt);
  assert.equal(cancelled.length, 1);
  const second = await invite(seller);
  assert.equal((await call("/partner-invites/accept", seller, "POST", { code: second.code })).status, 409);
});

test("new account accepts without card; publishes at 5%; expiry hides every discovery path and paid access restores it", async () => {
  const seller = await member("new-seller");
  const invitation = await invite(seller);
  const accepted = await call("/partner-invites/accept", seller, "POST", { code: invitation.code });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.data.user.successFeeRate, 0.05);
  assert.equal(accepted.body.data.user.hasPaidPlan, true);
  assert.equal(accepted.body.data.user.canStartTrial, false);
  assert.equal((await call("/billing/checkout", seller, "POST", { plan: "Premium" })).status, 400);
  const submitted = await call("/submit", seller, "POST", listingPayload);
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.data.listingFeeWaived, true);
  const approved = await call(`/admin/submissions/${submitted.body.data.submissionId}/approve`, admin, "POST");
  assert.equal(approved.status, 200);
  const id = approved.body.data.listingId;
  assert.equal((await call(`/listings/${id}`, seller)).body.data.canAccess, true);
  assert.equal((await call(`/listings/${id}/save`, buyer, "POST")).status, 200);
  assert.equal((await call(`/deal-analysis/${id}`, buyer)).status, 200);
  // Separate listing exercises admin sale invoicing while the offer is active.
  const copy = (await Listing.findById(id)).toObject();
  delete copy._id; delete copy.__v;
  const saleListing = await Listing.create(copy);
  const sale = await call(`/admin/listings/${saleListing._id}/mark-sold`, admin, "POST", { salePrice: 500000 });
  assert.equal(sale.body.data.commissionGBP, 25000);
  assert.equal(sale.body.data.rate, 0.05);

  await User.findByIdAndUpdate(seller._id, { invitedPartnerEndsAt: new Date(Date.now() - 1000) });
  // No request from the seller is needed for listing expiry.
  const publicListings = await call("/public/listings", null);
  assert.equal(publicListings.body.data.properties.some((item) => item.id === id), false);
  assert.equal((await call("/listings", buyer)).body.data.properties.some((item) => item.id === id), false);
  assert.equal((await call(`/listings/${id}`, buyer)).status, 404);
  assert.equal((await call(`/listings/${id}/save`, buyer, "POST")).status, 404);
  assert.equal((await call("/listings/saved", buyer)).body.data.some((item) => item.id === id), false);
  assert.equal((await call("/deal-analysis/deals", buyer)).body.data.deals.some((item) => item.id === id), false);
  assert.equal((await call(`/deal-analysis/${id}`, buyer)).status, 404);
  assert.equal((await call(`/deal-analysis/${id}/contact`, buyer)).status, 404);
  assert.equal((await call(`/deal-analysis/${id}/enquiry`, buyer, "POST", { message: "Hello" })).status, 404);
  assert.equal((await call("/overview", buyer)).body.data.savedProperties.some((item) => item.id === id), false);
  assert.equal((await call("/listings", seller)).status, 402);
  assert.equal((await call("/submit", seller, "POST", listingPayload)).status, 402);
  assert.equal((await call("/submit/draft", seller, "POST", { title: "Preserved draft" })).status, 200);
  const expiredUser = await User.findById(seller._id);
  assert.equal(hasPaidSubscription(expiredUser), false);
  assert.equal(canStartFreeTrial(expiredUser), false);
  assert.equal(getSuccessFeeRate(expiredUser), 0.1);
  assert.equal((await Listing.findById(id)).status, "live");
  assert.equal((await Submission.findById(submitted.body.data.submissionId)).status, "live");

  await User.findByIdAndUpdate(seller._id, { plan: "Premium", subscriptionStatus: "active", stripeSubscriptionId: "test-new-paid" });
  assert.equal((await call(`/listings/${id}`, buyer)).status, 200);
  assert.equal((await call("/public/listings", null)).body.data.properties.some((item) => item.id === id), true);
  assert.equal((await call("/overview", buyer)).body.data.savedProperties.some((item) => item.id === id), true);
  const afterSale = await call(`/admin/listings/${id}/mark-sold`, admin, "POST", { salePrice: 500000 });
  assert.equal(afterSale.body.data.commissionGBP, 50000);
  assert.equal(afterSale.body.data.rate, 0.1);
});

test("competing invitations cannot extend the offer and transaction failure rolls back redemption", async () => {
  const seller = await member("concurrent");
  const first = await invite(seller);
  const second = await invite(seller);
  const results = await Promise.allSettled([
    partnerInviteService.accept(seller._id, first.code),
    partnerInviteService.accept(seller._id, second.code),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(await PartnerInvite.countDocuments({ email: seller.email, status: "used" }), 1);
  const rollbackUser = await member("rollback");
  const rollbackInvite = await invite(rollbackUser);
  const save = PartnerInvite.prototype.save;
  PartnerInvite.prototype.save = async function () { throw new Error("Simulated database write failure"); };
  try {
    await assert.rejects(partnerInviteService.accept(rollbackUser._id, rollbackInvite.code), /Simulated database/);
  } finally { PartnerInvite.prototype.save = save; }
  assert.equal((await User.findById(rollbackUser._id)).invitedPartnerStartedAt, null);
  assert.equal((await PartnerInvite.findById(rollbackInvite.id)).status, "active");
});
