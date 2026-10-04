import {
  fetchPlatformSettings,
  updatePlatformSettings,
} from "../services/settingsService.js";

/**
 * Platform Settings & Governance controller. GET returns the persisted config
 * registry plus a live governance snapshot (fleet, partners, payment ledger,
 * admin accounts, Moamalat environment and current session). PATCH persists
 * partial section updates or resets the registry to the real defaults.
 */
export const getPlatformSettings = async (req, res, next) => {
  try {
    const data = await fetchPlatformSettings(req);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const updatePlatformSettingsEntry = async (req, res, next) => {
  try {
    const data = await updatePlatformSettings(req, req.body);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};