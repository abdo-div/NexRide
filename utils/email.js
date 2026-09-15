import nodemailer from "nodemailer";
import { htmlToText } from "html-to-text";

/**
 * Enterprise Transactional Email Dispatcher
 */
export default class Email {
  /**
   * @param {Object} user - Target user object ({ email, name })
   * @param {string} url - Target action URL for the email template
   */
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name ? user.name.split(" ")[0] : "Valued Customer";
    this.url = url;
    this.from = `${process.env.EMAIL_FROM_NAME || "NexRide Support"} <${
      process.env.EMAIL_FROM || "support@nexride.com"
    }>`;
  }

  /**
   * Creates pooled SMTP transport gateway based on environment context
   * @private
   */
  _createTransport() {
    if (process.env.NODE_ENV === "production") {
      // Production SMTP Transporter (SendGrid, AWS SES, or custom SMTP)
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.sendgrid.net",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
        pool: true, // Reuse pooled SMTP connections
        maxConnections: 5,
        maxMessages: 100,
      });
    }

    // Local Development Sandbox Transporter (Mailtrap / Mailhog)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "127.0.0.1",
      port: Number(process.env.EMAIL_PORT) || 1025,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Base Layout Wrapper for Responsive HTML Emails
   * @private
   */
  _getLayout(title, contentHtml) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f6f8fa;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <!-- Brand Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:36px 40px;text-align:center;">
                    <h1 style="color:#e94560;margin:0;font-size:26px;letter-spacing:2px;font-weight:800;">NEX<span style="color:#ffffff;">RIDE</span></h1>
                    <p style="color:#a0aec0;margin:6px 0 0;font-size:12px;letter-spacing:1px;font-weight:600;text-transform:uppercase;">Enterprise Fleet Management</p>
                  </td>
                </tr>
                <!-- Content Body -->
                <tr>
                  <td style="padding:40px;">
                    ${contentHtml}
                  </td>
                </tr>
                <!-- Brand Footer -->
                <tr>
                  <td style="background-color:#f6f8fa;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="color:#a0aec0;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} NexRide Platform. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generates specific HTML body content by template identifier
   * @private
   */
  _renderTemplate(template) {
    if (template === "passwordReset") {
      const content = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:22px;">Password Reset Request</h2>
        <p style="color:#4a5568;line-height:1.7;margin:0 0 16px;">Hello <strong>${this.firstName}</strong>,</p>
        <p style="color:#4a5568;line-height:1.7;margin:0 0 24px;">
          We received a request to reset the password for your NexRide account. Send a <strong>PATCH</strong> request containing your new 
          <code style="background:#f0f4f8;padding:2px 6px;border-radius:4px;">password</code> and 
          <code style="background:#f0f4f8;padding:2px 6px;border-radius:4px;">passwordConfirm</code> payload to the endpoint below:
        </p>
        <div style="background:#f0f4f8;border-left:4px solid #e94560;border-radius:4px;padding:16px;margin:0 0 24px;word-break:break-all;">
          <p style="margin:0;font-size:13px;color:#2d3748;font-family:monospace;">${this.url}</p>
        </div>
        <p style="color:#718096;font-size:13px;line-height:1.7;margin:0 0 12px;">
          ⏰ This security token is valid for <strong>10 minutes</strong>.
        </p>
        <p style="color:#718096;font-size:13px;line-height:1.7;margin:0;">
          If you did not initiate this request, please disregard this automated notice.
        </p>
      `;
      return this._getLayout("NexRide — Password Reset", content);
    }

    // Default Welcome Template
    const content = `
      <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:22px;">Welcome Aboard 🏎️</h2>
      <p style="color:#4a5568;line-height:1.7;margin:0 0 16px;">Hello <strong>${this.firstName}</strong>,</p>
      <p style="color:#4a5568;line-height:1.7;margin:0 0 24px;">
        Welcome to NexRide. Your corporate user account has been successfully initialized. You can now access our fleet reservation portal and platform APIs.
      </p>
      <a href="${this.url}" style="display:inline-block;background:linear-gradient(135deg,#e94560,#c0392b);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">
        Access Account Dashboard &rarr;
      </a>
    `;
    return this._getLayout("Welcome to NexRide", content);
  }

  /**
   * Dispatch engine using configured transport channel
   * @param {string} template - Name of template to render
   * @param {string} subject - Email subject line
   */
  async send(template, subject) {
    try {
      const html = this._renderTemplate(template);

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html, {
          wordwrap: 120,
          selectors: [{ selector: "a", options: { ignoreHref: false } }],
        }),
      };

      const transporter = this._createTransport();
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error(`💥 Failed to send email to ${this.to}:`, err.message);
      throw new Error("There was an error sending the email. Try again later.");
    }
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to NexRide Fleet Services!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "NexRide Security: Password Reset Request"
    );
  }
}