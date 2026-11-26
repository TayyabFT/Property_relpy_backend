import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Never connect to configured databases, Stripe, or email services during these tests.
Object.assign(process.env, {
  NODE_ENV: "production", JWT_SECRET: "isolated-affiliate-tests", MONGODB_URI: "",
  STRIPE_SECRET_KEY: "", SMTP_USER: "", SMTP_PASS: "",
  CLIENT_URL: "http://localhost:3000",
  MONGOMS_DOWNLOAD_DIR: resolve("node_modules/.cache/mongodb-memory-server"),
  MONGOMS_RUNTIME_DOWNLOAD: "false",
});
const { createApp } = await import("../src/app.js");
const { User } = await import("../src/modules/auth/auth.model.js");
const { Affiliate, AffiliateCommission, AffiliatePayout } = await import("../src/modules/affiliates/affiliate.model.js");
const { affiliateService } = await import("../src/modules/affiliates/affiliate.service.js");
const { emailService } = await import("../src/services/email.js");

let db, server, base, admin, marketer, affiliate;
const originalQueue = emailService.queueEmail;
before(async () => {
  db = await MongoMemoryReplSet.create({ binary: { version: "7.0.24" }, instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1 } });
  await mongoose.connect(db.getUri("affiliate-tests"));
  await Promise.all([User.init(), Affiliate.init(), AffiliateCommission.init(), AffiliatePayout.init()]);
  emailService.queueEmail = () => {};
  admin = await member("admin", { role: "admin" });
  marketer = await member("ali");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  emailService.queueEmail = originalQueue;
  if (server) await new Promise((done) => server.close(done));
  await mongoose.disconnect();
  if (db) await db.stop();
});

async function member(name, fields = {}) {
  return User.create({ firstName: name, lastName: "Test", email: `${name}@example.test`, password: "Test-Password-123", ...fields });
}
async function call(path, user, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  if (user) headers.Authorization = `Bearer ${jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET)}`;
  const res = await fetch(`${base}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json() };
}
function signup(name, referralCode) {
  return call("/auth/register", null, "POST", { firstName: name, lastName: "Lead", email: `${name}@example.test`, password: "Test-Password-123", referralCode });
}

test("admin creates an affiliate for an existing account with a £15 default and a unique code", async () => {
  assert.equal((await call("/affiliates", admin, "POST", { email: "nobody@example.test" })).status, 404);
  assert.equal((await call("/affiliates", admin, "POST", { email: admin.email })).status, 400);
  assert.equal((await call("/affiliates", admin, "POST", { email: marketer.email, code: "no spaces" })).status, 400);
  assert.equal((await call("/affiliates", marketer, "POST", { email: marketer.email })).status, 403);

  const res = await call("/affiliates", admin, "POST", { email: marketer.email, code: "ali123" });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.code, "ALI123");
  assert.equal(res.body.data.commissionGBP, 15);
  assert.equal(res.body.data.link, "http://localhost:3000/?ref=ALI123");
  assert.equal((await User.findById(marketer._id)).isAffiliate, true);
  affiliate = await Affiliate.findById(res.body.data.id);

  assert.equal((await call("/affiliates", admin, "POST", { email: marketer.email })).status, 409);
  const other = await member("sam");
  assert.equal((await call("/affiliates", admin, "POST", { email: other.email, code: "ALI123" })).status, 409);
  const generated = await call("/affiliates", admin, "POST", { email: other.email });
  assert.match(generated.body.data.code, /^SAM\d{3}$/);
});

test("referral link clicks count only for active codes", async () => {
  assert.deepEqual((await call("/affiliates/click", null, "POST", { code: "ali123" })).body.data, { valid: true });
  assert.deepEqual((await call("/affiliates/click", null, "POST", { code: "WRONG1" })).body.data, { valid: false });
  assert.equal((await Affiliate.findById(affiliate._id)).clicks, 1);
});

test("signup with a referral code links the new user to the affiliate; bad codes are rejected", async () => {
  const bad = await signup("typo", "NOPE99");
  assert.equal(bad.status, 400);
  assert.equal(await User.exists({ email: "typo@example.test" }), null);

  assert.equal((await signup("lead1", " ali123 ")).status, 201);
  assert.equal((await signup("lead2", "ALI123")).status, 201);
  assert.equal((await signup("organic")).status, 201);
  const lead = await User.findOne({ email: "lead1@example.test" });
  assert.equal(String(lead.referredByAffiliate), String(affiliate._id));
  assert.equal(lead.referralCode, "ALI123");
  assert.equal((await User.findOne({ email: "organic@example.test" })).referredByAffiliate, null);
});

test("commission is earned once, on the first paid subscription payment only", async () => {
  const lead = await User.findOne({ email: "lead1@example.test" });
  const organic = await User.findOne({ email: "organic@example.test" });
  assert.equal(await affiliateService.recordFirstPayment(organic._id, { reference: "cs_organic", amountPaidPence: 3500 }), null);

  const commission = await affiliateService.recordFirstPayment(lead._id, { reference: "cs_first", amountPaidPence: 3500 });
  assert.equal(commission.amountGBP, 15);
  assert.equal(commission.paymentAmountGBP, 35);
  // Webhook retry and the next month's renewal must not pay again
  assert.equal(await affiliateService.recordFirstPayment(lead._id, { reference: "cs_first", amountPaidPence: 3500 }), null);
  assert.equal(await affiliateService.recordFirstPayment(lead._id, { reference: "in_renewal", amountPaidPence: 3500 }), null);
  assert.equal(await AffiliateCommission.countDocuments({ referredUser: lead._id }), 1);
});

test("affiliates see only their own stats with short names; admins see full details", async () => {
  const mine = await call("/affiliates/me", marketer);
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.signups, 2);
  assert.equal(mine.body.data.payingCustomers, 1);
  assert.equal(mine.body.data.pendingGBP, 15);
  assert.equal(mine.body.data.clicks, 1);
  assert.ok(mine.body.data.referrals.every((r) => r.email === undefined && /^lead\d L\.$/.test(r.name)));

  const outsider = await User.findOne({ email: "organic@example.test" });
  assert.equal((await call("/affiliates/me", outsider)).status, 404);
  assert.equal((await call("/affiliates", marketer)).status, 403);
  assert.equal((await call(`/affiliates/${affiliate._id}`, marketer)).status, 403);

  const detail = await call(`/affiliates/${affiliate._id}`, admin);
  assert.ok(detail.body.data.referrals.some((r) => r.email === "lead1@example.test"));
  const list = await call("/affiliates", admin);
  assert.equal(list.body.data.find((a) => a.code === "ALI123").pendingGBP, 15);
});

test("marking paid records a payout and settles every pending commission once", async () => {
  const lead2 = await User.findOne({ email: "lead2@example.test" });
  await affiliateService.recordFirstPayment(lead2._id, { reference: "cs_second", amountPaidPence: 2500 });

  const paid = await call(`/affiliates/${affiliate._id}/payouts`, admin, "POST", { reference: "Bank transfer 26 Nov" });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.data.pendingGBP, 0);
  assert.equal(paid.body.data.paidGBP, 30);
  assert.deepEqual(paid.body.data.payouts.map((p) => [p.amountGBP, p.commissionCount, p.reference]), [[30, 2, "Bank transfer 26 Nov"]]);
  assert.equal((await call(`/affiliates/${affiliate._id}/payouts`, admin, "POST", {})).status, 400);

  const paidCommission = await AffiliateCommission.findOne({ affiliate: affiliate._id });
  assert.equal((await call(`/affiliates/commissions/${paidCommission._id}/void`, admin, "POST", {})).status, 409);
});

test("paused affiliates take no new signups; earlier referrals still earn; commission changes apply to new earnings", async () => {
  assert.equal((await signup("lead3", "ALI123")).status, 201);
  await call(`/affiliates/${affiliate._id}`, admin, "PATCH", { status: "paused", commissionGBP: 20 });
  assert.equal((await signup("late", "ALI123")).status, 400);
  assert.deepEqual((await call("/affiliates/click", null, "POST", { code: "ALI123" })).body.data, { valid: false });

  const lead3 = await User.findOne({ email: "lead3@example.test" });
  const commission = await affiliateService.recordFirstPayment(lead3._id, { reference: "cs_third", amountPaidPence: 2500 });
  assert.equal(commission.amountGBP, 20);
  const voided = await call(`/affiliates/commissions/${commission._id}/void`, admin, "POST", { reason: "Refunded" });
  assert.equal(voided.status, 200);
  assert.equal(voided.body.data.pendingGBP, 0);
  assert.equal(voided.body.data.payingCustomers, 2);
});
