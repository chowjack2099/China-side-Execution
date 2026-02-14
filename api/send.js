// /api/send.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const OWNER_EMAIL = "info@chinaexecution.com";
const FROM_EMAIL = "ChinaExecution <no-reply@chinaexecution.com>";

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    const name = (data.name || "").trim();
    const email = (data.email || "").trim();
    const company = (data.company || "").trim();
    const timeline = (data.timeline || "").trim();
    const details = (data.details || data.message || "").trim();
    const source = (data.source || "website").trim();

    if (!email || !details) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (data._gotcha && data._gotcha !== "") {
      return res.status(200).json({ success: true });
    }

    // 1️⃣ 通知你
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [OWNER_EMAIL],
      subject: `New Lead — ${name || "No Name"}`,
      html: `
        <h2>New Execution Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || "-")}</p>
        <p><strong>Timeline:</strong> ${escapeHtml(timeline || "-")}</p>
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
        <hr/>
        <pre>${escapeHtml(details)}</pre>
      `,
      replyTo: email
    });

    // 2️⃣ 自动回复客户
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "We received your execution request",
      html: `
        <p>Dear ${escapeHtml(name || "")},</p>
        <p>Thank you for contacting ChinaExecution.</p>
        <p>We have received your request and will review it shortly.</p>
        <p>Typical response time: within 24 hours.</p>
        <br>
        <p>For urgent matters, WhatsApp us:</p>
        <p><a href="https://wa.me/19192131199">+1 919 213 1199</a></p>
        <br>
        <p>Best regards,<br>
        ChinaExecution Team<br>
        Bestoo Service LLC</p>
      `,
      replyTo: OWNER_EMAIL
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Email sending failed" });
  }
}
