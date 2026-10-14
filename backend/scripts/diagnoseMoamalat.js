import dotenv from "dotenv";
import { moamalatConfig, isMoamalatConfigured } from "../config/moamalat.js";
import { formatTrxDateTime } from "../services/moamalat.service.js";
dotenv.config({ path: "config.env", quiet: true });
const hexKey = /^(?:[0-9a-f]{2})+$/i.test(moamalatConfig.secureKey);
// Safe to share: never print merchant credentials, raw signing key, signatures or card data.
console.log(JSON.stringify({
  configured: isMoamalatConfigured(), environment: moamalatConfig.env,
  merchantIdPresent: Boolean(moamalatConfig.merchantId), terminalIdPresent: Boolean(moamalatConfig.terminalId),
  secureKeyValidHex: hexKey, lightBoxUrl: moamalatConfig.lightBoxUrl,
  verifyUrl: moamalatConfig.verifyUrl, timeZone: moamalatConfig.timeZone,
  utcNow: new Date().toISOString(), checkoutTimeLocal: formatTrxDateTime(),
}, null, 2));
process.exit(0);
