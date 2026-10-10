import { buildAnalyticsSummary } from "../services/analyticsService.js";

/**
 * Live Reports & Analytics for the admin surface. The window (`period`) and
 * optional `hub` scope drive every KPI on the Reports page server-side, so the
 * numbers are derived entirely from real Booking/Payment/Vehicle data.
 */
export const getAnalyticsSummary = async (req, res, next) => {
  try {
    const { period, hub } = req.query;
    const summary = await buildAnalyticsSummary({
      period,
      hub: hub || undefined,
    });
    res.status(200).json({
      status: "success",
      data: { summary },
    });
  } catch (err) {
    next(err);
  }
};