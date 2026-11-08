import { createMpgsConfig } from "../payments/providers/mpgs/mpgs.config.js";
import { MpgsClient } from "../payments/providers/mpgs/mpgs.client.js";
import { MpgsProvider } from "../payments/providers/mpgs/mpgs.provider.js";

/** Lazily creates the portable provider so importing the API never reads secrets. */
export const createConfiguredMpgsProvider = ({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const config = createMpgsConfig(env);
  const client = new MpgsClient({ config, fetchImpl });
  return new MpgsProvider({ client });
};

export const getMpgsPublicConfig = (env = process.env) => {
  const config = createMpgsConfig(env);
  return Object.freeze({
    environment: config.merchantId.toUpperCase().startsWith("TEST")
      ? "test"
      : "production",
    checkoutScriptUrl: `${config.baseUrl}/static/checkout/checkout.min.js`,
    currency: config.currency,
  });
};
