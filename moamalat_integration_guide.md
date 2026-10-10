# Moamalat LightBox Payment Integration Guide

A complete, copy-paste-ready reference for integrating the Moamalat payment gateway
into any **Node.js / Express** backend + **React / TypeScript** frontend project.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Environment Variables](#2-environment-variables)
3. [Backend — Config](#3-backend--config)
4. [Backend — Service (Signing & Verification)](#4-backend--service-signing--verification)
5. [Backend — Controller](#5-backend--controller)
6. [Backend — Routes](#6-backend--routes)
7. [Backend — Mount in app.js](#7-backend--mount-in-appjs)
8. [Frontend — API Client](#8-frontend--api-client)
9. [Frontend — LightBox Loader](#9-frontend--lightbox-loader)
10. [Frontend — Checkout Flow (React)](#10-frontend--checkout-flow-react)
11. [TypeScript Types (global.d.ts)](#11-typescript-types-globaldts)
12. [How It All Fits Together](#12-how-it-all-fits-together)
13. [Checklist](#13-checklist)

---

## 1. Overview

Moamalat uses an **iframe LightBox** model:

```
Browser                     Your Server                 Moamalat
  |                              |                           |
  |-- POST /payments/create ---> |                           |
  |                              | signs amount (HMAC-SHA256)|
  |<-- { MID, TID, Amount,  -----|                           |
  |      SecureHash, ... }       |                           |
  |                              |                           |
  | load lightbox.js (CDN) ----> |                           |
  | Lightbox.configure(params)   |                           |
  | Lightbox.showLightbox() ---> | --------- iframe -------> |
  |                              |            card entry     |
  |<-- completeCallback(resp) ---|<----- payment result -----|
  |                              |                           |
  |-- POST /payments/verify ---> |                           |
  |                              |-- FilterTransactions ---> |
  |                              |<-- transaction data ------|
  |<-- { verified: true/false }--|                           |
```

- **1 LYD = 1 000 Moamalat units** (e.g. 150 LYD → `AmountTrxn = "150000"`)
- The **SecureHash** is an HMAC-SHA256 over the amount + timestamps + merchant identity using your **hex-encoded** secure key.
- The **verify step** is mandatory — never trust the LightBox callback alone.

---

## 2. Environment Variables

Add to your `.env` / `config.env`:

```dotenv
MOAMALAT_MID=<your merchant id>
MOAMALAT_TID=<your terminal id>
MOAMALAT_SECURE_KEY=<your hex-encoded secure key>
MOAMALAT_ENV=test          # or: prod / production
```

| Variable | Description |
|---|---|
| `MOAMALAT_MID` | Merchant ID assigned by Moamalat |
| `MOAMALAT_TID` | Terminal ID assigned by Moamalat |
| `MOAMALAT_SECURE_KEY` | Hex-encoded HMAC signing key |
| `MOAMALAT_ENV` | `test` → sandbox, `prod`/`production` → live |

---

## 3. Backend — Config

> `backend/config/moamalat.js`

```js
/**
 * Moamalat payment gateway configuration.
 *
 * Reads the four MOAMALAT_* variables from the environment and resolves the
 * gateway endpoints based on which environment the project is pointed at.
 */

const LIGHTBOX_URLS = {
  test: "https://tnpg.moamalat.net:6006/js/lightbox.js",
  prod: "https://npg.moamalat.net:6006/js/lightbox.js",
  production: "https://npg.moamalat.net:6006/js/lightbox.js",
};

const VERIFY_URLS = {
  test: "https://tnpg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions",
  prod: "https://npg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions",
  production: "https://npg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions",
};

export const moamalatConfig = {
  get env() {
    const raw = (process.env.MOAMALAT_ENV || "test").toLowerCase();
    return raw === "prod" || raw === "production" ? "production" : "test";
  },
  /** Merchant identifier assigned by Moamalat (MOAMALAT_MID). */
  get merchantId() {
    return process.env.MOAMALAT_MID ?? "";
  },
  /** Terminal identifier assigned by Moamalat (MOAMALAT_TID). */
  get terminalId() {
    return process.env.MOAMALAT_TID ?? "";
  },
  /** Hex-encoded signing key used for HMAC-SHA256 (MOAMALAT_SECURE_KEY). */
  get secureKey() {
    return process.env.MOAMALAT_SECURE_KEY ?? "";
  },
  get lightBoxUrl() {
    return LIGHTBOX_URLS[this.env] || LIGHTBOX_URLS.test;
  },
  get verifyUrl() {
    return VERIFY_URLS[this.env] || VERIFY_URLS.test;
  },
};

export const isMoamalatConfigured = () =>
  Boolean(
    moamalatConfig.merchantId &&
      moamalatConfig.terminalId &&
      moamalatConfig.secureKey,
  );
```

---

## 4. Backend — Service (Signing & Verification)

> `backend/services/moamalat.service.js`

This is the most important file — it contains all signing and verification logic.

```js
import crypto from "node:crypto";
import { moamalatConfig, isMoamalatConfigured } from "../config/moamalat.js";

// -----------------------------------------------------------------------------
// Formatting helpers
// -----------------------------------------------------------------------------

const pad2 = (value) => String(value).padStart(2, "0");

/**
 * 1 LYD = 1000 Moamalat units.
 * AmountTrxn must be the integer of (amountLyd * 1000).
 */
export const amountToUnits = (amountLyd) => Math.round(amountLyd * 1000);

/**
 * YYYYMMDDHHmm — used in the checkout SecureHash string.
 */
export const formatTrxDateTime = (date = new Date()) =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}${pad2(
    date.getHours(),
  )}${pad2(date.getMinutes())}`;

/**
 * YYMMDDHHmmss — used in the verification SecureHash + FilterTransactions body.
 */
export const formatVerificationDateTime = (date = new Date()) =>
  `${pad2(date.getFullYear() % 100)}${pad2(date.getMonth() + 1)}${pad2(
    date.getDate(),
  )}${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;

/**
 * YYYYMMDD — FilterTransactions DateFrom / DateTo window.
 */
export const formatDateParam = (date = new Date()) =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;

// -----------------------------------------------------------------------------
// HMAC-SHA256 signing
// NOTE: The secure key is treated as a hex string and decoded to raw bytes.
// -----------------------------------------------------------------------------

const hmacDigest = (data) =>
  crypto
    .createHmac("sha256", Buffer.from(moamalatConfig.secureKey, "hex"))
    .update(data)
    .digest("hex");

/**
 * Checkout SecureHash (UPPERCASE).
 * Sent to the LightBox inside the configure object.
 *
 * String format:
 *   Amount=<units>&DateTimeLocalTrxn=<YYYYMMDDHHmm>&MerchantId=<MID>&MerchantReference=<ref>&TerminalId=<TID>
 */
export const generateSecureHash = ({
  amount,       // integer units (amountLyd * 1000)
  trxDateTime,  // YYYYMMDDHHmm
  merchantId,
  merchantReference,
  terminalId,
}) =>
  hmacDigest(
    `Amount=${amount}&DateTimeLocalTrxn=${trxDateTime}&MerchantId=${merchantId}` +
      `&MerchantReference=${merchantReference}&TerminalId=${terminalId}`,
  ).toUpperCase();

/**
 * Verification SecureHash (lowercase).
 * Sent to FilterTransactions to authenticate the query.
 *
 * String format:
 *   DateTimeLocalTrxn=<YYMMDDHHmmss>&MerchantId=<MID>&TerminalId=<TID>
 */
export const generateVerificationHash = ({
  trxDateTime,  // YYMMDDHHmmss
  merchantId,
  terminalId,
}) =>
  hmacDigest(
    `DateTimeLocalTrxn=${trxDateTime}&MerchantId=${merchantId}&TerminalId=${terminalId}`,
  );

// -----------------------------------------------------------------------------
// Checkout params builder
// -----------------------------------------------------------------------------

/**
 * Returns the exact object the Moamalat LightBox `configure` property expects.
 * The amount is signed on the server so the browser cannot tamper with it.
 *
 * @param {number} amountLyd   - Amount in LYD (e.g. 150.5)
 * @param {string} merchantRef - Unique reference for this payment attempt
 * @returns {{ MID, TID, AmountTrxn, MerchantReference, TrxDateTime, SecureHash }}
 */
export const buildCheckoutParams = (amountLyd, merchantRef) => {
  const trxDateTime = formatTrxDateTime();
  const amount = amountToUnits(amountLyd);

  return {
    MID: moamalatConfig.merchantId,
    TID: moamalatConfig.terminalId,
    AmountTrxn: String(amount),
    MerchantReference: merchantRef,
    TrxDateTime: trxDateTime,
    SecureHash: generateSecureHash({
      amount,
      trxDateTime,
      merchantId: moamalatConfig.merchantId,
      merchantReference: merchantRef,
      terminalId: moamalatConfig.terminalId,
    }),
  };
};

// -----------------------------------------------------------------------------
// Transaction verification (FilterTransactions)
// -----------------------------------------------------------------------------

/**
 * Verifies a payment against Moamalat's FilterTransactions API.
 * This is the authoritative source of truth — never trust the LightBox callback alone.
 *
 * @param {{ merchantReference: string, expectedAmount: number, systemReference?: string }} opts
 * @returns {Promise<{ verified: boolean, reason?: string, merchantReference, systemReference, networkReference, amount, status }>}
 */
export const verifyTransaction = async ({
  merchantReference,
  expectedAmount,   // in LYD (e.g. 150.5) — the server converts to units for comparison
  systemReference,
} = {}) => {
  if (!isMoamalatConfigured()) {
    throw new Error("Moamalat is not configured. Set MOAMALAT_* env vars.");
  }

  const now = new Date();
  const dateTimeLocalTrxn = formatVerificationDateTime(now);
  const dateToday = formatDateParam(now);

  const secureHash = generateVerificationHash({
    trxDateTime: dateTimeLocalTrxn,
    merchantId: moamalatConfig.merchantId,
    terminalId: moamalatConfig.terminalId,
  });

  const requestBody = {
    SecureHash: secureHash,
    DateTimeLocalTrxn: dateTimeLocalTrxn,
    TerminalId: moamalatConfig.terminalId,
    MerchantId: moamalatConfig.merchantId,
    DateFrom: dateToday,
    DateTo: dateToday,
    MerchantReference: String(merchantReference),
    FetchType: "0",
    DisplayStart: "0",
    DisplayLength: "1",
  };

  let response;
  let responseText = "";
  let gateway = null;

  try {
    response = await fetch(moamalatConfig.verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    responseText = await response.text();
    try {
      gateway = JSON.parse(responseText);
    } catch {
      gateway = null;
    }
  } catch (err) {
    throw new Error(`Moamalat verification network request failed: ${err.message}`);
  }

  if (!response?.ok || !gateway) {
    console.error("Moamalat verification failed:", response?.status, responseText);
    return {
      verified: false,
      reason: "Moamalat verification request failed.",
      status: "GATEWAY_ERROR",
      merchantReference,
    };
  }

  console.log("Moamalat FilterTransactions response:", JSON.stringify(gateway, null, 2));

  // ----- Walk the response tree to find the matching transaction -----
  let matchedTransaction = null;

  // Primary path: gateway.Transactions[].DateTransactions[]
  if (Array.isArray(gateway.Transactions)) {
    for (const group of gateway.Transactions) {
      if (!group || !Array.isArray(group.DateTransactions)) continue;
      for (const txn of group.DateTransactions) {
        if (txn && String(txn.MerchantReference) === String(merchantReference)) {
          matchedTransaction = txn;
          break;
        }
      }
      if (matchedTransaction) break;
    }
  }

  // Fallback: generic deep-walk for any alternative structure
  if (!matchedTransaction) {
    const collectRows = (node, rows = []) => {
      if (!node || typeof node !== "object") return rows;
      if (Array.isArray(node)) {
        node.forEach((entry) => collectRows(entry, rows));
        return rows;
      }
      if (node.MerchantReference) {
        rows.push(node);
        return rows;
      }
      ["Transactions", "DateTransactions"].forEach((key) => {
        if (node[key]) collectRows(node[key], rows);
      });
      return rows;
    };
    matchedTransaction = collectRows(gateway, []).find(
      (row) => String(row.MerchantReference) === String(merchantReference),
    );
  }

  if (!matchedTransaction) {
    return {
      verified: false,
      reason: "Transaction was not found.",
      status: "NOT_FOUND",
      merchantReference,
      systemReference: "",
      networkReference: "",
      amount: 0,
    };
  }

  // ----- Validate the matched transaction -----
  const gatewayAmount = Number(matchedTransaction.AmountTrxn);
  const referenceMatches =
    String(matchedTransaction.MerchantReference) === String(merchantReference);

  // expectedAmount may be in LYD or already in units — auto-detect
  const expectedAmountUnits =
    expectedAmount != null
      ? expectedAmount > 5000
        ? Math.round(Number(expectedAmount))          // already in units
        : Math.round(Number(expectedAmount) * 1000)  // in LYD
      : gatewayAmount; // no expectation → accept whatever gateway returned

  const amountMatches =
    Number.isFinite(gatewayAmount) &&
    Math.round(gatewayAmount) === Math.round(expectedAmountUnits);

  const statusApproved =
    String(matchedTransaction.Status || "").toLowerCase() === "approved";

  const gatewaySystemReference =
    matchedTransaction.TransactionId != null
      ? String(matchedTransaction.TransactionId)
      : null;

  const systemReferenceMatches =
    !systemReference ||
    !gatewaySystemReference ||
    String(systemReference) === gatewaySystemReference;

  if (!referenceMatches || !amountMatches || !statusApproved || !systemReferenceMatches) {
    return {
      verified: false,
      reason: "Transaction details did not match.",
      status: matchedTransaction.Status || null,
      gatewayAmount: matchedTransaction.AmountTrxn || null,
      merchantReference,
      systemReference: gatewaySystemReference || String(systemReference || ""),
      networkReference: matchedTransaction.RRN || "",
      amount: Number(matchedTransaction.AmountTrxn ?? 0),
    };
  }

  return {
    verified: true,
    merchantReference: matchedTransaction.MerchantReference,
    systemReference: gatewaySystemReference || String(systemReference || ""),
    networkReference: matchedTransaction.RRN || "",
    amount: Number(matchedTransaction.AmountTrxn ?? 0),
    status: matchedTransaction.Status || "Approved",
  };
};
```

> **Key validation rules checked against the gateway response:**
> 1. `MerchantReference` must match exactly
> 2. `AmountTrxn` must equal the expected amount (in Moamalat units)
> 3. `Status` must be `"Approved"` (case-insensitive)
> 4. `TransactionId` (SystemReference) must match if provided by the callback

---

## 5. Backend — Controller

> `backend/controllers/moamalatController.js`

```js
import crypto from "node:crypto";
import { moamalatConfig, isMoamalatConfigured } from "../config/moamalat.js";
import {
  buildCheckoutParams,
  verifyTransaction,
} from "../services/moamalat.service.js";

/**
 * In-memory store for pending payments.
 * In production, replace this with a database table / Redis.
 */
export const pendingPayments = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateAmount(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false, error: "Amount is required." };
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) return { ok: false, error: "Amount must be a valid number." };
  if (num <= 0) return { ok: false, error: "Amount must be greater than zero." };
  if (num > 1_000_000) return { ok: false, error: "Amount is too large." };
  return { ok: true, value: num };
}

function generateReference() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// GET /api/payments/moamalat/config
// Returns the LightBox script URL so the frontend can load it dynamically.
// No credentials are exposed.
// ---------------------------------------------------------------------------

export const getGatewayConfig = async (req, res) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({
      error: "Moamalat is not configured. Add MOAMALAT_* environment variables.",
    });
  }
  res.status(200).json({
    status: "success",
    lightBoxUrl: moamalatConfig.lightBoxUrl,
    env: moamalatConfig.env,
    data: {
      lightBoxUrl: moamalatConfig.lightBoxUrl,
      env: moamalatConfig.env,
    },
  });
};

// ---------------------------------------------------------------------------
// POST /api/payments/moamalat/create
// Body: { amount: number (LYD), reference?: string }
//
// Signs the amount server-side and returns the params the LightBox needs.
// ---------------------------------------------------------------------------

export const createPayment = async (req, res) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({ error: "Server is not configured for payments." });
  }

  const { amount, reference } = req.body || {};

  const check = validateAmount(amount);
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const merchantReference =
    reference && String(reference).trim()
      ? String(reference).trim().slice(0, 40)
      : generateReference();

  const params = buildCheckoutParams(check.value, merchantReference);

  // Store so the verify endpoint can retrieve the expected amount
  pendingPayments.set(merchantReference, {
    merchantReference,
    amountTrxn: params.AmountTrxn,          // in Moamalat units (string)
    amountLyd: check.value,                  // in LYD (number)
    createdAt: Date.now(),
    verified: false,
  });

  // Dual-format response: top-level fields for the LightBox configure object,
  // plus a data wrapper for structured frontend consumption.
  res.status(200).json({
    status: "success",
    ...params,
    data: {
      payment: {
        merchantReference,
        amount: check.value,
      },
      gateway: {
        lightBoxUrl: moamalatConfig.lightBoxUrl,
        env: moamalatConfig.env,
        params,
      },
    },
  });
};

// ---------------------------------------------------------------------------
// POST /api/payments/moamalat/verify
// Body: { merchantReference: string, systemReference?: string }
//
// Confirms the payment against Moamalat's FilterTransactions API.
// ---------------------------------------------------------------------------

export const verifyPayment = async (req, res) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({ verified: false, reason: "Server is not configured." });
  }

  const { merchantReference, systemReference } = req.body || {};

  if (!merchantReference) {
    return res.status(400).json({ verified: false, reason: "Missing merchantReference." });
  }

  const pending = pendingPayments.get(String(merchantReference));

  if (!pending) {
    return res.status(404).json({
      verified: false,
      reason: "Payment record not found. It may have expired or never been created.",
    });
  }

  // Idempotency: already verified
  if (pending.verified) {
    return res.status(200).json({
      verified: true,
      merchantReference,
      systemReference: pending.systemReference || systemReference || "",
      amount: pending.amountLyd,
      status: "APPROVED",
      alreadyProcessed: true,
    });
  }

  const result = await verifyTransaction({
    merchantReference: String(merchantReference),
    expectedAmount: pending.amountLyd,
    systemReference,
  });

  if (!result.verified) {
    return res.status(200).json({
      verified: false,
      reason: result.reason || "Transaction details did not match.",
      status: result.status || null,
      gatewayAmount: result.gatewayAmount || null,
    });
  }

  // Mark as verified in memory
  pending.verified = true;
  pending.verifiedAt = Date.now();
  pending.systemReference = result.systemReference || "";
  pending.networkReference = result.networkReference || "";
  pendingPayments.set(String(merchantReference), pending);

  // ✅ HERE: Add your own business logic (e.g. mark order as paid in DB)

  return res.status(200).json({
    verified: true,
    merchantReference: result.merchantReference,
    systemReference: result.systemReference || "",
    networkReference: result.networkReference || null,
    amount: Number(result.amount) / 1000, // convert back to LYD
    status: result.status,
  });
};
```

---

## 6. Backend — Routes

> `backend/routes/moamalatRoutes.js`

```js
import express from "express";
import {
  getGatewayConfig,
  createPayment,
  verifyPayment,
} from "../controllers/moamalatController.js";

const router = express.Router();

// Public: hands the browser the LightBox script URL. No secrets exposed.
router.get("/config", getGatewayConfig);

// Create a signed payment session
router.post("/create", createPayment);

// Verify a completed payment against the gateway
router.post("/verify", verifyPayment);

export default router;
```

---

## 7. Backend — Mount in `app.js`

```js
import moamalatRouter from "./routes/moamalatRoutes.js";

// Mount under your API prefix
app.use("/api/v1/payments/moamalat", moamalatRouter);

// Routes exposed:
//   GET  /api/v1/payments/moamalat/config
//   POST /api/v1/payments/moamalat/create
//   POST /api/v1/payments/moamalat/verify
```

> Make sure `express.json()` middleware is applied **before** the routes:
> ```js
> app.use(express.json({ limit: "10kb" }));
> ```

---

## 8. Frontend — API Client

> `src/lib/moamalatApi.ts`

```typescript
// ---- Types ----

export interface MoamalatGatewayParams {
  MID: string;
  TID: string;
  AmountTrxn: string;
  MerchantReference: string;
  TrxDateTime: string;
  SecureHash: string;
}

export interface GatewayConfigResponse {
  status: string;
  lightBoxUrl?: string;
  env?: string;
  data: { lightBoxUrl: string; env: string };
}

export interface CreatePaymentResponse {
  status: string;
  // Top-level fields (for direct LightBox use)
  MID?: string;
  TID?: string;
  AmountTrxn?: string;
  MerchantReference?: string;
  TrxDateTime?: string;
  SecureHash?: string;
  // Nested data wrapper
  data: {
    payment: { merchantReference: string; amount: number };
    gateway: { lightBoxUrl: string; env: string; params: MoamalatGatewayParams };
  };
}

export interface VerifyResponse {
  verified: boolean;
  merchantReference?: string;
  systemReference?: string;
  networkReference?: string;
  amount?: number;
  status?: string;
  reason?: string;
  alreadyProcessed?: boolean;
}

// ---- HTTP helper ----
// Replace with your own fetch wrapper / axios instance as needed.

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Request failed");
  return json as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Request failed");
  return json as T;
}

// ---- API surface ----

export const moamalatApi = {
  /** Get LightBox script URL (no secrets). */
  getConfig: (): Promise<GatewayConfigResponse> =>
    get("/payments/moamalat/config"),

  /**
   * Create a signed payment session.
   * @param amount  Amount in LYD (e.g. 150.5)
   * @param reference  Optional custom merchant reference
   */
  create: (payload: {
    amount: number;
    reference?: string;
  }): Promise<CreatePaymentResponse> =>
    post("/payments/moamalat/create", payload),

  /**
   * Verify the payment against the gateway after the LightBox callback.
   * @param merchantReference  The reference from the create step
   * @param systemReference    The TransactionId from the LightBox callback
   */
  verify: (payload: {
    merchantReference: string;
    systemReference?: string | null;
  }): Promise<VerifyResponse> =>
    post("/payments/moamalat/verify", payload),
};
```

---

## 9. Frontend — LightBox Loader

> `src/lib/moamalatLightbox.ts`

Manages dynamic script injection and exposes a clean API over the global `window.Lightbox`.

```typescript
import { moamalatApi } from "./moamalatApi";
import type { MoamalatGatewayParams } from "./moamalatApi";

// Singletons — ensures the script is only injected once per page load
let lightboxPromise: Promise<LightboxApi> | null = null;
let scriptPromise: Promise<void> | null = null;

/** Returns the global Moamalat LightBox API if it has been loaded. */
export const getLightboxApi = (): LightboxApi | null =>
  (window as any).Lightbox ?? (window as any).lightbox ?? null;

// Injects the <script> tag and resolves when window.Lightbox is ready
const injectScript = (url: string): Promise<void> => {
  if (getLightboxApi()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const pending = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-moamalat-lightbox]",
    );
    if (existing?.dataset.loaded === "true") { resolve(); return; }

    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => { cleanup(); script.dataset.loaded = "true"; resolve(); };
    const onError = () => { cleanup(); script.remove(); reject(new Error("Failed to load Moamalat payment script")); };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) {
      script.src = url;
      script.async = true;
      script.setAttribute("data-moamalat-lightbox", "true");
      document.head.appendChild(script);
    }
  }).catch((err) => { scriptPromise = null; throw err; });

  scriptPromise = pending;
  return pending;
};

/**
 * Fetches the LightBox URL from your backend, injects the script, and returns
 * the global LightBox API. Safe to call multiple times — loads only once.
 */
export const loadMoamalatLightbox = async (): Promise<LightboxApi> => {
  const existing = getLightboxApi();
  if (existing) return existing;

  if (!lightboxPromise) {
    lightboxPromise = (async () => {
      const { data } = await moamalatApi.getConfig();

      // Attempt 1
      const loadAttempt = async () => {
        try { await injectScript(data.lightBoxUrl); } catch { /* retry below */ }
        if (!getLightboxApi()) {
          await new Promise((r) => setTimeout(r, 1500)); // grace period
        }
        return getLightboxApi();
      };

      let api = await loadAttempt();

      // Attempt 2 (retry once)
      if (!api) {
        document.querySelector("script[data-moamalat-lightbox]")?.remove();
        scriptPromise = null;
        api = await loadAttempt();
      }

      if (!api) {
        document.querySelector("script[data-moamalat-lightbox]")?.remove();
        scriptPromise = null;
        throw new Error("The Moamalat payment window could not be opened");
      }

      return api;
    })().finally(() => { lightboxPromise = null; });
  }

  return lightboxPromise;
};

export interface LightboxCallbacks {
  onComplete: (response: LightboxCompleteResponse) => void;
  onError?: (error?: any) => void;
  onCancel?: () => void;
}

/**
 * Configures and opens the Moamalat LightBox.
 * Call this AFTER `loadMoamalatLightbox()` has resolved.
 */
export const openMoamalatLightbox = (
  params: MoamalatGatewayParams,
  callbacks: LightboxCallbacks,
): void => {
  const api = getLightboxApi();
  if (!api) throw new Error("Moamalat LightBox is not loaded");

  api.Checkout.configure = {
    ...params,
    completeCallback: (response) => {
      console.log("MOAMALAT COMPLETE:", response);
      try { api.Checkout.closeLightbox(); } catch { /* ignore */ }
      callbacks.onComplete(response);
    },
    errorCallback: (err) => {
      console.error("MOAMALAT ERROR:", err);
      callbacks.onError?.(err);
    },
    cancelCallback: () => {
      console.log("MOAMALAT CANCELLED");
      callbacks.onCancel?.();
    },
  };

  api.Checkout.showLightbox();
};

/** Programmatically closes the LightBox (safe to call anytime). */
export const closeMoamalatLightbox = (): void => {
  try { getLightboxApi()?.Checkout.closeLightbox(); } catch { /* ignore */ }
};
```

---

## 10. Frontend — Checkout Flow (React)

> `src/pages/CheckoutPage.tsx` — minimal, self-contained example

```tsx
import React, { useState } from "react";
import { moamalatApi } from "../lib/moamalatApi";
import {
  loadMoamalatLightbox,
  openMoamalatLightbox,
  closeMoamalatLightbox,
} from "../lib/moamalatLightbox";

interface Props {
  /** Amount in LYD */
  amount: number;
  /** Called after payment is verified successfully */
  onSuccess: (merchantReference: string) => void;
}

export const CheckoutButton: React.FC<Props> = ({ amount, onSuccess }) => {
  const [phase, setPhase] = useState<"idle" | "loading" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (phase !== "idle") return;
    setError(null);
    setPhase("loading");

    try {
      // 1. Load the LightBox script (fetches URL from backend)
      await loadMoamalatLightbox();

      // 2. Create a signed payment session on the server
      const res = await moamalatApi.create({ amount });
      const params = res.data.gateway.params;

      // 3. Open the LightBox iframe
      openMoamalatLightbox(params, {
        onComplete: async (response) => {
          closeMoamalatLightbox();
          setPhase("processing");

          try {
            // 4. Verify the payment server-side (MANDATORY)
            const verifyRes = await moamalatApi.verify({
              merchantReference: params.MerchantReference,
              systemReference:
                response?.SystemReference ?? response?.systemReference ?? null,
            });

            if (verifyRes.verified) {
              // 5. Payment confirmed — run your success logic
              onSuccess(params.MerchantReference);
            } else {
              setPhase("idle");
              setError(verifyRes.reason ?? "Payment was not approved. Please try again.");
            }
          } catch (err) {
            setPhase("idle");
            setError(err instanceof Error ? err.message : "Verification failed.");
          }
        },
        onError: () => {
          closeMoamalatLightbox();
          setPhase("idle");
          setError("A payment gateway error occurred. Please try again.");
        },
        onCancel: () => {
          closeMoamalatLightbox();
          setPhase("idle");
          setError("Payment was cancelled.");
        },
      });
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Could not load the payment window.");
    }
  };

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={phase !== "idle"}
        style={{ padding: "12px 24px", fontSize: 16, cursor: phase === "idle" ? "pointer" : "not-allowed" }}
      >
        {phase === "idle" && `Pay ${amount} LYD`}
        {phase === "loading" && "Opening payment window…"}
        {phase === "processing" && "Verifying payment…"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
};
```

**Usage:**
```tsx
<CheckoutButton
  amount={150.5}
  onSuccess={(ref) => {
    console.log("Paid! Reference:", ref);
    navigate("/thank-you");
  }}
/>
```

---

## 11. TypeScript Types (`global.d.ts`)

The Moamalat LightBox registers a global `window.Lightbox`. Add these types to your
project so TypeScript knows about it:

> `src/types/moamalat.d.ts` (or add to `src/global.d.ts`)

```typescript
export interface LightboxCompleteResponse {
  /** Gateway transaction ID — use as systemReference in the verify call */
  SystemReference?: string;
  systemReference?: string;
  /** Moamalat merchant reference (echoed back) */
  MerchantReference?: string;
  merchantReference?: string;
  /** Raw status string from the gateway */
  Status?: string;
  status?: string;
  /** Amount in Moamalat units */
  AmountTrxn?: string;
  [key: string]: unknown;
}

export interface LightboxCheckout {
  configure: {
    MID?: string;
    TID?: string;
    AmountTrxn?: string;
    MerchantReference?: string;
    TrxDateTime?: string;
    SecureHash?: string;
    completeCallback?: (response: LightboxCompleteResponse) => void;
    errorCallback?: (error?: any) => void;
    cancelCallback?: () => void;
    [key: string]: unknown;
  };
  showLightbox: () => void;
  closeLightbox: () => void;
}

export interface LightboxApi {
  Checkout: LightboxCheckout;
}

declare global {
  interface Window {
    Lightbox?: LightboxApi;
    lightbox?: LightboxApi;
  }
}
```

---

## 12. How It All Fits Together

```
config.env
  MOAMALAT_MID, MOAMALAT_TID, MOAMALAT_SECURE_KEY, MOAMALAT_ENV
          │
          ▼
backend/config/moamalat.js
  ─ exposes moamalatConfig { merchantId, terminalId, secureKey, lightBoxUrl, verifyUrl }
  ─ exposes isMoamalatConfigured()
          │
          ▼
backend/services/moamalat.service.js
  ─ amountToUnits(lyd)              → integer in Moamalat units
  ─ formatTrxDateTime()             → YYYYMMDDHHmm  (checkout hash)
  ─ formatVerificationDateTime()    → YYMMDDHHmmss  (verify hash)
  ─ generateSecureHash(params)      → HMAC-SHA256 UPPERCASE (checkout)
  ─ generateVerificationHash(params)→ HMAC-SHA256 lowercase (verify)
  ─ buildCheckoutParams(lyd, ref)   → { MID, TID, AmountTrxn, ... }
  ─ verifyTransaction({ ref, amt }) → { verified, ... }
          │
          ▼
backend/controllers/moamalatController.js
  ─ getGatewayConfig  → GET  /config
  ─ createPayment     → POST /create    signs & stores pendingPayments
  ─ verifyPayment     → POST /verify    calls verifyTransaction, marks paid
          │
          ▼
backend/routes/moamalatRoutes.js  →  app.js  →  /api/v1/payments/moamalat/*
          │
          ▼ (HTTP)
frontend/src/lib/moamalatApi.ts
  ─ getConfig()   → GET  /config
  ─ create(amt)   → POST /create
  ─ verify(ref)   → POST /verify
          │
          ▼
frontend/src/lib/moamalatLightbox.ts
  ─ loadMoamalatLightbox()   → fetches lightBoxUrl, injects <script>, waits for window.Lightbox
  ─ openMoamalatLightbox()   → sets configure callbacks, calls showLightbox()
  ─ closeMoamalatLightbox()  → calls closeLightbox() safely
          │
          ▼
frontend/src/pages/CheckoutPage.tsx
  1. loadMoamalatLightbox()
  2. moamalatApi.create({ amount })      → signed params
  3. openMoamalatLightbox(params, cbs)   → customer pays in iframe
  4. onComplete → moamalatApi.verify()   → confirmed / rejected
  5. navigate to success or show error
```

---

## 13. Checklist

Before going live, confirm:

- [ ] `MOAMALAT_MID`, `MOAMALAT_TID`, `MOAMALAT_SECURE_KEY` are set in production env
- [ ] `MOAMALAT_ENV=prod` (or `production`) is set for the live environment
- [ ] The **verify step** is always called after the LightBox `completeCallback` — never skip it
- [ ] Your `pendingPayments` store (or DB table) persists the `amountLyd` so the verify step can confirm the amount was not tampered with
- [ ] The `SecureHash` is generated **server-side** — never on the client
- [ ] CORS is configured to allow the Moamalat LightBox iframe to post back to your frontend origin
- [ ] The LightBox URL in the sandbox is `https://tnpg.moamalat.net:6006/js/lightbox.js`
- [ ] The LightBox URL in production is `https://npg.moamalat.net:6006/js/lightbox.js`
- [ ] FilterTransactions verify URL in sandbox: `https://tnpg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions`
- [ ] FilterTransactions verify URL in production: `https://npg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions`
- [ ] Node.js 18+ is used (native `fetch` required; or polyfill with `node-fetch`)

---

*Generated from the NexRide project — Moamalat integration, September 2026.*
