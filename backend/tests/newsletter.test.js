import test from "node:test";
import assert from "node:assert/strict";
import { subscribeNewsletterSchema } from "../validations/newsletter.validation.js";
import NewsletterSubscriber from "../models/newsletterSubscriber.model.js";

test("newsletter validation normalizes a valid subscription", async () => {
  const parsed = await subscribeNewsletterSchema.parseAsync({
    body: { email: "  Member@Example.com ", locale: "en" },
  });

  assert.equal(parsed.body.email, "Member@Example.com");
  assert.equal(parsed.body.locale, "en");
});

test("newsletter validation rejects malformed email and unsupported locale", async () => {
  await assert.rejects(
    subscribeNewsletterSchema.parseAsync({
      body: { email: "not-an-email", locale: "fr" },
    }),
  );
});

test("newsletter subscriptions have a unique email index", () => {
  const emailIndex = NewsletterSubscriber.schema
    .indexes()
    .find(([fields]) => fields.email === 1);

  assert.ok(emailIndex);
  assert.equal(emailIndex[1].unique, true);
});
