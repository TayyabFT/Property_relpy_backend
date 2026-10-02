export async function cancelSubscriptionForOffer(client, subscriptionId) {
  const subscription = await client.subscriptions.retrieve(subscriptionId);
  if (subscription.status !== "canceled") {
    await client.subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false });
  }
}

export async function issueSaleFeeInvoice(client, customerId, listing, amountGBP, rate, basisLabel) {
  const commissionGBP = Math.round(amountGBP * rate * 100) / 100;
  // Attach the fee to this invoice explicitly. Stripe excludes pending items by
  // default, and including all pending items could collect unrelated charges.
  const invoice = await client.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 14,
    auto_advance: false,
  });
  await client.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: Math.round(commissionGBP * 100),
    currency: "gbp",
    description: `${Math.round(rate * 100)}% success fee — "${listing.title}" (${basisLabel} £${Number(amountGBP).toLocaleString("en-GB")})`,
  });
  await client.invoices.finalizeInvoice(invoice.id);
  await client.invoices.sendInvoice(invoice.id);
  return { commissionGBP, stripeInvoiceId: invoice.id, rate };
}
