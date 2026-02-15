你这版报错的根因是这里多了一个多余的结束符，导致脚本结构被破坏：

```js
`;
`;
```

我已经修复，并顺便加了错误消息标准化，避免前端再看到 `[object Object]`。下面是可直接替换的完整 `api/send.js`：

```js
// /api/send.js
// Vercel Serverless Function (Node.js)
// Uses Resend HTTP API directly (no npm dependency)

export default async function handler(req, res) {
  // ---- Basic CORS (optional, safe) ----
  const origin = req.headers.origin || "";
  const allowedOrigins = new Set([
    "https://chinaexecution.com",
    "https://www.chinaexecution.com",
  ]);
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://chinaexecution.com");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    // For direct browser visit: show Method not allowed (expected)
    return res.status(405).send("Method not allowed");
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing RESEND_API_KEY" });
    }

    const contentType = (req.headers["content-type"] || "").toLowerCase();
    const data = await readBody(req, contentType);

    // ---- Normalize fields (compatible with your index/ads) ----
    const name = sanitize(data.name || data.fullname || "");
    const email = sanitize(data.email || data.from || "");
    const company = sanitize(data.company || "");
    const timeline = sanitize(data.timeline || "");
    const details = sanitize(data.details || data.message || data.notes || "");
    const source = sanitize(data.source || data.page || data.utm_source || "");

    if (!email || !isEmail(email)) {
      return respond(req, res, 400, {
        ok: false,
        error: "Invalid email",
      });
    }

    if (!details) {
      return respond(req, res, 400, {
        ok: false,
        error: "Missing details/message",
      });
    }

    // ---- Your identities ----
    const OWNER_TO = process.env.LEAD_TO_EMAIL || "info@chinaexecution.com";
    const FROM = process.env.RESEND_FROM || "ChinaExecution <info@chinaexecution.com>"; // must be verified in Resend
    const REPLY_TO_OWNER = email; // so you can reply directly to the lead
    const REPLY_TO_CUSTOMER = OWNER_TO;

    // ---- 1) Email to you (lead notification) ----
    const leadSubject = `New Lead - ChinaExecution (${source || "website"})`;

    const leadText =
`New lead received

Name: ${name || "-"}
Email: ${email}
Company: ${company || "-"}
Timeline: ${timeline || "-"}
Source: ${source || "-"}

Details:
${details}
`;

    const leadHtml = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
  <h2 style="margin:0 0 12px">New lead received</h2>
  <table style="border-collapse:collapse">
    <tr><td style="padding:4px 10px 4px 0"><b>Name</b></td><td>${escapeHtml(name || "-")}</td></tr>
    <tr><td style="padding:4px 10px 4px 0"><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
    <tr><td style="padding:4px 10px 4px 0"><b>Company</b></td><td>${escapeHtml(company || "-")}</td></tr>
    <tr><td style="padding:4px 10px 4px 0"><b>Timeline</b></td><td>${escapeHtml(timeline || "-")}</td></tr>
    <tr><td style="padding:4px 10px 4px 0"><b>Source</b></td><td>${escapeHtml(source || "-")}</td></tr>
  </table>
  <h3 style="margin:16px 0 8px">Details</h3>
  <div style="white-space:pre-wrap;border:1px solid #eee;border-radius:10px;padding:12px;background:#fafafa">
    ${escapeHtml(details)}
  </div>
</div>
`;

    // ---- 2) Auto-reply to customer ----
    const customerSubject = "We received your request - ChinaExecution";

    const customerText =
`Hi${name ? " " + name : ""},

Thank you for contacting ChinaExecution.

We have received your request. Our team will review the details and respond within 24 hours.

For faster coordination, you may contact us directly:

WhatsApp Business:
https://wa.me/19192131199

Email:
info@chinaexecution.com

To help us evaluate and execute efficiently, please include:

• City / location (if applicable)
• Timeline or deadline
• Relevant links, files, screenshots, or references
• Clear objective (what outcome you expect)

ChinaExecution provides on-the-ground execution support across China, including but not limited to:

• Supplier & factory coordination
• Local investigation & verification
• Site visits & inspections
• Document handling & government procedures
• Logistics follow-up
• Business & operational support tasks

We focus on execution, clarity, and practical follow-through.

Best regards,
ChinaExecution
Operated by Bestoo Service LLC
`;

    const customerHtml = `
<div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">
  <p>Hi ${escapeHtml(name || "there")},</p>

  <p>
    Thank you for contacting <strong>ChinaExecution</strong>.
    We have received your request and will review the details carefully.
    Our team will respond within <strong>24 hours</strong>.
  </p>

  <p style="margin:16px 0 6px;"><strong>For faster coordination:</strong></p>

  <ul style="margin:6px 0 16px 18px;">
    <li>
      WhatsApp Business:
      <a href="https://wa.me/19192131199" target="_blank" rel="noopener">
        +1 919 213 1199
      </a>
    </li>
    <li>
      Email:
      <a href="mailto:info@chinaexecution.com">
        info@chinaexecution.com
      </a>
    </li>
  </ul>

  <p style="margin:16px 0 6px;"><strong>To help us evaluate and execute efficiently, please include:</strong></p>

  <ul style="margin:6px 0 16px 18px;">
    <li>City / location (if applicable)</li>
    <li>Timeline or deadline</li>
    <li>Relevant links, files, screenshots, or references</li>
    <li>Clear objective (what outcome you expect)</li>
  </ul>

  <p>
    ChinaExecution provides on-the-ground execution support across China,
    including but not limited to:
  </p>

  <ul style="margin:6px 0 16px 18px;">
    <li>Supplier & factory coordination</li>
    <li>Local investigation & verification</li>
    <li>Site visits & inspections</li>
    <li>Document handling & government procedures</li>
    <li>Logistics follow-up</li>
    <li>Business & operational support tasks</li>
  </ul>

  <p>
    We focus on execution, clarity, and practical follow-through.
  </p>

  <p style="margin-top:20px;">
    Best regards,<br/>
    <strong>ChinaExecution</strong><br/>
    Operated by Bestoo Service LLC
  </p>
</div>
`;

    // ---- Send via Resend API ----
    // 1) to owner
    await resendSendEmail(RESEND_API_KEY, {
      from: FROM,
      to: OWNER_TO,
      subject: leadSubject,
      text: leadText,
      html: leadHtml,
      reply_to: REPLY_TO_OWNER,
    });

    // 2) to customer (auto reply) - best effort, should not block form success.
    try {
      await resendSendEmail(RESEND_API_KEY, {
        from: FROM,
        to: email,
        subject: customerSubject,
        text: customerText,
        html: customerHtml,
        reply_to: REPLY_TO_CUSTOMER,
      });
    } catch (autoReplyErr) {
      console.error("AUTO_REPLY_ERROR:", autoReplyErr);
    }

    // ---- Return: B mode (HTML form => redirect, fetch => JSON) ----
    return respond(req, res, 200, { ok: true });
  } catch (err) {
    // In case Resend returns error / parse error
    console.error("SEND_ERROR:", err);
    return respond(req, res, 500, { ok: false, error: normalizeErrorMessage(err) });
  }
}

/* ---------------- Helpers ---------------- */

async function readBody(req, contentType) {
  // Vercel might parse body as object/string/buffer depending on config.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    return parseRawBody(rawBody, contentType);
  }

  const raw = await readRaw(req);
  return parseRawBody(raw, contentType);
}

function parseRawBody(raw, contentType) {
  if (!raw) return {};

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartFormData(raw, contentType);
  }

  // fallback: try JSON first, then urlencoded
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return Object.fromEntries(new URLSearchParams(raw));
    } catch {
      return {};
    }
  }
}

function parseMultipartFormData(raw, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
  if (!boundaryMatch) return {};

  const boundary = boundaryMatch[1].replace(/^"|"$/g, "");
  const marker = `--${boundary}`;
  const out = {};

  for (const part of String(raw).split(marker)) {
    if (!part || part === "--" || part === "--\r\n") continue;

    const cleaned = part.replace(/^\r\n/, "").replace(/\r\n--$/, "");
    const sepIdx = cleaned.indexOf("\r\n\r\n");
    if (sepIdx < 0) continue;

    const header = cleaned.slice(0, sepIdx);
    const value = cleaned.slice(sepIdx + 4).replace(/\r\n$/, "");
    const nameMatch = header.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;

    out[nameMatch[1]] = value;
  }

  return out;
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function resendSendEmail(apiKey, payload) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Resend API error: ${r.status} ${txt}`);
  }

  return r.json().catch(() => ({}));
}

function respond(req, res, status, json) {
  const accept = (req.headers["accept"] || "").toLowerCase();

  // If it's a normal browser form submit, Accept usually contains text/html
  if (accept.includes("text/html")) {
    if (status >= 200 && status < 300) {
      res.statusCode = 303; // POST -> GET redirect
      res.setHeader("Location", "/thank-you.html");
      return res.end();
    }
    // failure: show a minimal message (no JSON popup)
    res.statusCode = status;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Submission failed. Please try again or contact us directly.");
  }

  // fetch/ajax
  return res.status(status).json(json);
}

function sanitize(v) {
  return String(v || "").trim();
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeErrorMessage(err) {
  if (!err) return "Send failed";
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message.trim()) return err.message;

  try {
    return JSON.stringify(err);
  } catch {
    return "Send failed";
  }
}
