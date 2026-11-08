import { PaymentProvider } from "../../core/payment-provider.js";
import { MpgsError } from "./mpgs.errors.js";
import {
  normalizeAmount,
  normalizeCheckoutInput,
  normalizeCurrency,
  normalizeOperation,
  normalizeOrderId,
} from "./mpgs.validation.js";

const PENDING_STATUSES = new Set([
  "INITIATED",
  "AUTHENTICATION_INITIATED",
  "AUTHENTICATED",
  "AUTHENTICATION_NOT_NEEDED",
]);
const FAILED_STATUSES = new Set([
  "FAILED",
  "CANCELLED",
  "AUTHENTICATION_UNSUCCESSFUL",
]);

const decimalUnits = (value) => {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(String(value));
  if (!match) return null;
  return BigInt(match[1]) * 1000n + BigInt((match[2] ?? "").padEnd(3, "0"));
};

const decimalEquals = (left, right) => {
  const leftUnits = decimalUnits(left);
  const rightUnits = decimalUnits(right);
  return leftUnits !== null && rightUnits !== null && leftUnits === rightUnits;
};

export class MpgsProvider extends PaymentProvider {
  constructor({ client }) {
    super();
    if (!client || typeof client.request !== "function") {
      throw new TypeError("An MPGS client is required");
    }
    this.client = client;
  }

  async createCheckout(input) {
    const checkout = normalizeCheckoutInput(input, this.client.config.currency);
    const request = {
      apiOperation: "INITIATE_CHECKOUT",
      checkoutMode: "WEBSITE",
      interaction: {
        operation: checkout.operation,
        merchant: { name: checkout.merchantName },
        returnUrl: checkout.returnUrl,
      },
      order: {
        id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        description: checkout.description,
      },
    };
    if (checkout.cancelUrl) request.interaction.cancelUrl = checkout.cancelUrl;

    const gateway = await this.client.request({
      method: "POST",
      path: "/session",
      body: request,
    });

    if (
      gateway?.result !== "SUCCESS" ||
      typeof gateway?.session?.id !== "string" ||
      !gateway.session.id ||
      typeof gateway?.successIndicator !== "string" ||
      !gateway.successIndicator
    ) {
      throw new MpgsError("MPGS did not create a valid checkout session", {
        gatewayCode: gateway?.error?.cause ?? gateway?.result ?? "INVALID_RESPONSE",
        retryable: gateway?.result === "PENDING",
      });
    }

    return {
      provider: "MPGS",
      orderId: checkout.orderId,
      amount: checkout.amount,
      currency: checkout.currency,
      operation: checkout.operation,
      sessionId: gateway.session.id,
      sessionVersion: gateway.session.version ?? null,
      successIndicator: gateway.successIndicator,
    };
  }

  async verifyPayment(input) {
    if (!input || typeof input !== "object") {
      throw new TypeError("verification input is required");
    }
    const orderId = normalizeOrderId(input.orderId);
    const expectedAmount = normalizeAmount(input.expectedAmount);
    const expectedCurrency = normalizeCurrency(input.expectedCurrency);
    const operation = normalizeOperation(input.operation);

    const gateway = await this.client.request({
      method: "GET",
      path: `/order/${encodeURIComponent(orderId)}`,
    });

    const gatewayOrderId = gateway?.id == null ? "" : String(gateway.id);
    const gatewayCurrency = gateway?.currency == null
      ? ""
      : String(gateway.currency).toUpperCase();
    const gatewayAmount = gateway?.amount;
    const gatewayStatus = gateway?.status ?? "UNKNOWN";
    const capturedAmount = gateway?.totalCapturedAmount ?? "0";
    const authorizedAmount = gateway?.totalAuthorizedAmount ?? "0";
    const successfulTransactions = Array.isArray(gateway?.transaction)
      ? gateway.transaction.filter((transaction) => transaction?.result === "SUCCESS")
      : [];
    const transactionId = successfulTransactions.at(-1)?.id ?? null;
    const identityMatches = gatewayOrderId === orderId;
    const currencyMatches = gatewayCurrency === expectedCurrency;
    const amountMatches =
      gatewayAmount != null && decimalEquals(gatewayAmount, expectedAmount);

    if (!identityMatches || !currencyMatches || !amountMatches) {
      return {
        provider: "MPGS",
        verified: false,
        outcome: "MISMATCH",
        orderId,
        gatewayStatus,
        amount: gatewayAmount ?? null,
        currency: gatewayCurrency || null,
        capturedAmount: String(capturedAmount),
      };
    }

    const expectedStatus = operation === "AUTHORIZE" ? "AUTHORIZED" : "CAPTURED";
    const amountWasProcessed = decimalEquals(
      operation === "AUTHORIZE" ? authorizedAmount : capturedAmount,
      expectedAmount,
    );
    const verified =
      gateway?.result === "SUCCESS" &&
      gatewayStatus === expectedStatus &&
      amountWasProcessed;

    let outcome = "FAILED";
    if (verified) outcome = "SUCCEEDED";
    else if (
      gateway?.result === "PENDING" ||
      gateway?.result === "UNKNOWN" ||
      PENDING_STATUSES.has(gatewayStatus)
    ) outcome = "PENDING";
    else if (!FAILED_STATUSES.has(gatewayStatus)) outcome = "UNVERIFIED";

    return {
      provider: "MPGS",
      verified,
      outcome,
      orderId,
      gatewayStatus,
      amount: String(gatewayAmount),
      currency: gatewayCurrency,
      capturedAmount: String(capturedAmount),
      authorizedAmount: String(authorizedAmount),
      fundingStatus: gateway?.fundingStatus ?? null,
      lastUpdatedTime: gateway?.lastUpdatedTime ?? null,
      transactionId,
    };
  }

  async refundPayment(input) {
    if (!input || typeof input !== "object") {
      throw new TypeError("refund input is required");
    }
    const orderId = normalizeOrderId(input.orderId);
    const refundTransactionId = normalizeOrderId(input.refundTransactionId);
    const targetTransactionId = normalizeOrderId(input.targetTransactionId);
    const amount = normalizeAmount(input.amount);
    const currency = normalizeCurrency(input.currency);

    const gateway = await this.client.request({
      method: "PUT",
      path:
        `/order/${encodeURIComponent(orderId)}` +
        `/transaction/${encodeURIComponent(refundTransactionId)}`,
      body: {
        apiOperation: "REFUND",
        transaction: {
          amount,
          currency,
          targetTransactionId,
        },
      },
    });

    const gatewayCode = gateway?.response?.gatewayCode ?? null;
    const succeeded =
      gateway?.result === "SUCCESS" &&
      ["APPROVED", "APPROVED_AUTO"].includes(gatewayCode);
    const pending =
      gateway?.result === "PENDING" || gatewayCode === "PENDING";

    return {
      provider: "MPGS",
      refunded: succeeded,
      outcome: succeeded ? "SUCCEEDED" : pending ? "PENDING" : "FAILED",
      orderId,
      refundTransactionId: gateway?.transaction?.id ?? refundTransactionId,
      targetTransactionId,
      amount,
      currency,
      gatewayCode,
      acquirerCode: gateway?.response?.acquirerCode ?? null,
    };
  }
}
