// /api/send.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const OWNER_EMAIL = "info@chinaexecution.com";
const FROM_EMAIL = "ChinaExecution <info@chinaexecution.com>";

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// 兼容 JSON / x-www-form-urlencoded / FormData(有些情况下会变成空对象或字符串)
function normalizeBody(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  let body = req.body;

  // Next/Vercel 有时给的是 Buffer
  if (Buffer.isBuffer(body)) body = body.toString("utf8");

  // 如果是字符串：通常是 urlencoded
  if (typeof body === "string") {
    try {
      // urlencoded: a=1&b=2
      const params = new URLSearchParams(body);
      const obj = {};
      for (const [k, v] of params.entries()) obj[k] = v;
      return obj;
    } catch {
      return {};
    }
  }

  // 如果是对象就直接返回（JSON 或已解析的表单）
  if (body && typeof body === "object") return body;

  // 兜底：有时 body 为空
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const data = normalizeBody(req);

    const name = (data.name || "").trim();
    const email = (data.email || "").trim();
    const company = (data.company || "").trim();
    const timeline = (data.timeline || "").trim();
    const details = (data.details || data.message || "").trim();
    const source = (data.source || "website").trim();

    // 蜜罐
    if (data._gotcha && String(data._gotcha).trim() !== "") {
      return res.status(200).json({ success: true });
    }

    if (!email || !details) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        debug: { hasEmail: !!email, hasDetails: !!details }
      });
    }

    // 1) 发给你（通知）
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [OWNER_EMAIL],
      subject: `New Lead — ${name || "No Name"}${timeline ? ` (${timeline})` : ""}`,
      html: `
        <h2>New Execution Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name || "-")}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || "-")}</p>
        <p><strong>Timeline:</strong> ${escapeHtml(timeline || "-")}</p>
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
        <hr/>
        <pre style="white-space:pre-wrap">${escapeHtml(details)}</pre>
      `,
      replyTo: email
    });

    // 2) 自动回复客户
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "We received your execution request",
      html: `
        <p>Dear ${escapeHtml(name || "")},</p>
        <p>Thank you for contacting <strong>ChinaExecution</strong>.</p>
        <p>We’ve received your request and will review it shortly.</p>
        <p><strong>Typical response time:</strong> within 24 hours.</p>
        <br/>
        <p>If this is urgent, contact us on WhatsApp:</p>
        <p><a href="https://wa.me/19192131199">+1 919 213 1199</a></p>
        <br/>
        <p>Best regards,<br/>
        ChinaExecution Team<br/>
        Bestoo Service LLC</p>
      `,
      replyTo: OWNER_EMAIL
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("SEND_ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Email sending failed",
      message: err?.message || String(err)
    });
  }
}
