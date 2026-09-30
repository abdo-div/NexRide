/**
 * Moamalat payment gateway configuration.
 *
 * Reads the four MOAMALAT_* variables from the environment and resolves the
 * gateway endpoints based on which Moamalat environment the project is pointed
 * at (test vs production).
 */

const ENV = process.env.MOAMALAT_ENV === "production" ? "production" : "test";

const LIGHTBOX_URLS = {
  test: "https://tnpg.moamalat.net:6006/js/lightbox.js",
  production: "https://npg.moamalat.net/js/lightbox.js",
};

const VERIFY_URLS = {
  test: "https://tnpg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions",
  production: "https://npg.moamalat.net/Cube/PayLink.svc/api/FilterTransactions",
};

export const moamalatConfig = {
  env: ENV,
  /** Merchant identifier assigned by Moamalat (MOAMALAT_MID). */
  merchantId: process.env.MOAMALAT_MID ?? "",
  /** Terminal identifier assigned by Moamalat (MOAMALAT_TID). */
  terminalId: process.env.MOAMALAT_TID ?? "",
  /** Hex-encoded signing key used for HMAC-SHA256 (MOAMALAT_SECURE_KEY). */
  secureKey: process.env.MOAMALAT_SECURE_KEY ?? "",
  lightBoxUrl: LIGHTBOX_URLS[ENV],
  verifyUrl: VERIFY_URLS[ENV],
};

export const isMoamalatConfigured = () =>
  Boolean(
    moamalatConfig.merchantId &&
      moamalatConfig.terminalId &&
      moamalatConfig.secureKey,
  );