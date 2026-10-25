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

/**
 * Base URL of the LightBox JSON API (the endpoints the hosted checkout page
 * itself calls: LightboxHostedCheckout / OpenLightBox / PayByCard). The
 * frontend never calls these directly; they are used only by the diagnostic
 * probe to inspect the raw gateway round-trip.
 */
const LIGHTBOX_API_URLS = {
  test: "https://tnpg.moamalat.net:6008/api/",
  prod: "https://npg.moamalat.net:6008/api/",
  production: "https://npg.moamalat.net:6008/api/",
};

export const moamalatConfig = {
  get env() {
    const raw = (process.env.MOAMALAT_ENV || "test").toLowerCase();
    return raw === "prod" || raw === "production" ? "production" : "test";
  },
  /** Merchant identifier assigned by Moamalat (MOAMALAT_MID). */
  get merchantId() {
    return process.env.MOAMALAT_MID?.trim() ?? "";
  },
  /** Terminal identifier assigned by Moamalat (MOAMALAT_TID). */
  get terminalId() {
    return process.env.MOAMALAT_TID?.trim() ?? "";
  },
  /** Hex-encoded signing key used for HMAC-SHA256 (MOAMALAT_SECURE_KEY). */
  get secureKey() {
    return process.env.MOAMALAT_SECURE_KEY?.trim() ?? "";
  },
  /** Local time used by Moamalat when validating signed transaction windows. */
  get timeZone() {
    return process.env.MOAMALAT_TIME_ZONE || "Africa/Tripoli";
  },
  get lightBoxUrl() {
    return LIGHTBOX_URLS[this.env] || LIGHTBOX_URLS.test;
  },
  /** LightBox JSON API base (LightboxHostedCheckout / OpenLightBox / PayByCard). */
  get lightBoxApiUrl() {
    return LIGHTBOX_API_URLS[this.env] || LIGHTBOX_API_URLS.test;
  },
  get verifyUrl() {
    return VERIFY_URLS[this.env] || VERIFY_URLS.test;
  },
};

export const isMoamalatConfigured = () => {
  const secureKey = moamalatConfig.secureKey;
  return Boolean(
    moamalatConfig.merchantId &&
      moamalatConfig.terminalId &&
      secureKey.length >= 32 &&
      secureKey.length % 2 === 0 &&
      /^[0-9a-f]+$/i.test(secureKey),
  );
};
