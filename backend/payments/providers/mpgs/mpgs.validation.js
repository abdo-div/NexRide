import crypto from "node:crypto";

const ORDER_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const AMOUNT_RE = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;
const OPERATIONS = new Set(["PURCHASE", "AUTHORIZE"]);

const requiredText = (value, name, maxLength) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new TypeError(`${name} must not exceed ${maxLength} characters`);
  }
  return normalized;
};

export const normalizeOrderId = (value) => {
  const orderId = requiredText(value, "orderId", 40);
  if (!ORDER_ID_RE.test(orderId)) {
    throw new TypeError(
      "orderId may contain only letters, numbers, underscores, and hyphens",
    );
  }
  return orderId;
};

export const generateOrderId = (prefix = "MPGS") => {
  const safePrefix = String(prefix)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 10) || "MPGS";
  const uniquePart = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return `${safePrefix}-${uniquePart}`.slice(0, 40);
};

export const normalizeCurrency = (value) => {
  const currency = requiredText(value, "currency", 3).toUpperCase();
  if (!CURRENCY_RE.test(currency)) {
    throw new TypeError("currency must be a three-letter ISO currency code");
  }
  return currency;
};

/**
 * MPGS accepts decimal amounts with at most three fractional digits. Returning
 * a string avoids binary floating-point changes in gateway comparisons.
 */
export const normalizeAmount = (value) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError("amount must be a positive decimal value");
  }
  const amount = String(value).trim();
  if (!AMOUNT_RE.test(amount) || Number(amount) <= 0) {
    throw new TypeError("amount must be positive with at most three decimal places");
  }
  return amount.includes(".")
    ? amount.replace(/0+$/, "").replace(/\.$/, "")
    : amount;
};

export const normalizeOperation = (value = "PURCHASE") => {
  const operation = String(value).trim().toUpperCase();
  if (!OPERATIONS.has(operation)) {
    throw new TypeError("operation must be PURCHASE or AUTHORIZE");
  }
  return operation;
};

export const normalizeReturnUrl = (value, name = "returnUrl") => {
  const raw = requiredText(value, name, 2048);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError(`${name} must be a valid absolute URL`);
  }
  const isLocalHttp =
    url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new TypeError(`${name} must use HTTPS (or localhost HTTP for development)`);
  }
  if (url.username || url.password) {
    throw new TypeError(`${name} must not contain credentials`);
  }
  return url.toString();
};

export const normalizeCheckoutInput = (input, configuredCurrency) => {
  if (!input || typeof input !== "object") {
    throw new TypeError("checkout input is required");
  }
  const checkout = {
    orderId: input.orderId
      ? normalizeOrderId(input.orderId)
      : generateOrderId(input.orderPrefix),
    amount: normalizeAmount(input.amount),
    currency: normalizeCurrency(configuredCurrency),
    description: requiredText(input.description, "description", 127),
    merchantName: requiredText(input.merchantName, "merchantName", 40),
    operation: normalizeOperation(input.operation),
    returnUrl: normalizeReturnUrl(input.returnUrl),
  };
  if (input.cancelUrl) {
    checkout.cancelUrl = normalizeReturnUrl(input.cancelUrl, "cancelUrl");
  }
  return checkout;
};
