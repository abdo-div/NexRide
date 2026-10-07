import { Worker } from "bullmq";
import { bullmqConnection, isRedisAvailable } from "../config/redis.js";
import { resolveClientUrl } from "../config/clientUrl.js";
import { sendEmail } from "../utils/email.js";
import logger from "../utils/logger.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Renders the platform-administrator notice emitted when a company submits a
 * partnership application. Pure function so it can be unit-tested without a
 * live Redis/SMTP.
 */
export const renderPartnerApplicationNotice = (payload = {}) => {
  const {
    applicationRef,
    companyName,
    city,
    subdomain,
    applicantName,
    applicantEmail,
    applicantPhone,
    fleetTier,
    fleetCategories = [],
    hubs = [],
    depotsCount = 0,
    docsCount = 0,
    payoutBank,
  } = payload;

  let reviewUrl = null;
  try {
    reviewUrl = `${resolveClientUrl()}/admin/companies`;
  } catch {
    reviewUrl = null;
  }

  const rows = [
    ["Application reference", applicationRef],
    ["Company", companyName],
    ["City", city],
    ["Subdomain", subdomain ? `${subdomain}.nexride.ly` : null],
    ["Applicant", applicantName],
    ["Applicant email", applicantEmail],
    ["Applicant phone", applicantPhone],
    ["Fleet tier", fleetTier],
    ["Categories", fleetCategories.join(", ") || null],
    ["Operating hubs", hubs.join(", ") || null],
    ["Depots", depotsCount ? String(depotsCount) : null],
    ["Documents uploaded", docsCount ? String(docsCount) : null],
    ["Payout bank", payoutBank || null],
  ];

  const body = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;font-weight:bold;color:#334155;white-space:nowrap;border-bottom:1px solid #e2e8f0;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:28px 32px;">
        <h1 style="color:#e94560;margin:0;font-size:22px;letter-spacing:2px;">NEX<span style="color:#ffffff;">RIDE</span></h1>
        <p style="color:#a0aec0;margin:6px 0 0;font-size:12px;letter-spacing:1px;">Partner Onboarding</p>
      </div>
      <div style="padding:28px 32px;">
        <h2 style="color:#1a1a2e;margin:0 0 4px;font-size:20px;">New Partner Application ${escapeHtml(applicationRef)}</h2>
        <p style="color:#4a5568;margin:0 0 20px;line-height:1.6;">
          A company submitted a partnership application on NexRide. Review the details and
          approve or reject it from the operator console.
        </p>
        <table width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">${body}</table>
        ${reviewUrl
          ? `<div style="margin:24px 0 0;">
              <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#e94560,#c0392b);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;">Open Review Desk &rarr;</a>
            </div>`
          : ""}
      </div>
      <div style="background:#f6f8fa;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} NexRide Platform. All rights reserved.</p>
      </div>
    </div>
  `;

  return {
    subject: `New Partner Application ${applicationRef} — ${companyName}`,
    html,
  };
};

const noopWorker = {
  close: async () => null,
};

/**
 * Starts the background email worker. Called after the HTTP server is listening
 * so an unreachable Redis can never delay or prevent the API from starting.
 */
export const startEmailWorker = async () => {
  const redisReady = await isRedisAvailable(bullmqConnection);

  if (!redisReady) {
    logger.warn("Redis unavailable; email worker disabled.");
    return noopWorker;
  }

  return new Worker(
    "email-queue",
    async (job) => {
      logger.info(
        { jobId: job.id, type: job.name },
        "Processing queued background email",
      );

      switch (job.name) {
        case "BOOKING_CONFIRMATION":
          await sendEmail({
            to: job.data.email,
            subject: `Booking Confirmation #${job.data.bookingId}`,
            html: `<h1>Booking Confirmed!</h1><p>Your booking for vehicle ${job.data.vehicleName} is confirmed.</p>`,
          });
          break;

        case "WELCOME_EMAIL":
          await sendEmail({
            to: job.data.email,
            subject: "Welcome to NexRide!",
            html: `<h1>Welcome ${job.data.name}!</h1><p>Thank you for joining NexRide.</p>`,
          });
          break;

        case "PARTNER_APPLICATION_RECEIVED":
          {
            const { subject, html } = renderPartnerApplicationNotice(job.data);
            await sendEmail({ to: job.data.to, subject, html });
          }
          break;

        default:
          logger.warn(
            { jobName: job.name },
            "Unhandled background email job type",
          );
      }
    },
    { connection: bullmqConnection, prefix: "nexride" },
  );
};
