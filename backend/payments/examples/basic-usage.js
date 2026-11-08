import {
  createMpgsConfig,
  MpgsClient,
  MpgsProvider,
} from "../index.js";

const config = createMpgsConfig(process.env);
const provider = new MpgsProvider({ client: new MpgsClient({ config }) });

// Values such as amount and order ID must come from your server-side database.
const checkout = await provider.createCheckout({
  orderId: "YOUR-UNIQUE-ORDER-1",
  amount: "10.000",
  description: "Example order",
  merchantName: process.env.MPGS_MERCHANT_NAME || "Example Merchant",
  operation: "PURCHASE",
  returnUrl: "https://shop.example/payment/return",
  cancelUrl: "https://shop.example/payment/cancel",
});

console.log({ orderId: checkout.orderId, sessionId: checkout.sessionId });
