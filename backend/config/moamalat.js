/**
 * Moamalat payment gateway configuration.
 *
 * Reads the four MOAMALAT_* variables from the environment and resolves the
 * gateway endpoints based on which Moamalat environment the project is pointed
 * at (test vs production).
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