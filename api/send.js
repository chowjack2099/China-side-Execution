// /api/send.js
export default async function handler(req, res) {
  // ---- CORS (可保留，防止跨域问题) ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(200).json({ ok: false, error: "Method not allowed" }); // 返回200，避免前端误判弹错
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ ok: false, error: "Missing RESEND_API_KEY" });
    }

    // 你想用自己的域名发件人（推荐）
    // 如果 Resend 那边还没完全放行/验证，你也可以临时改成 onboarding@resend.dev 排障
    const FROM = process.env.RESEND_FROM || "ChinaExecution <info@chinaexecution.com>";
    const ADMIN_TO = process.env.LEAD_TO || "info@chinaexecution.com";

    // ---- 兼容 body 可能是 string / object ----
    let data = req.body;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    data = data || {};

    // ---- 兼容 ads/index 两种字段命名 ----
    const name = data.name || "";
    const email = data.email || "";
    const company = data.company || "";
    const timeline = data.timeline || "";
    const source = data.source || data.page || "";
    const leadText = (data.details || data.message || "").trim();

    if (!email || !leadText) {
      return res.status(200).json({
        ok: false,
        error: "Missing required fields: email + details/message",
      });
    }

    // ============ 1) 管理员通知（必须成功） ============
    const adminSubject = `New Lead — ChinaExecution (${source || "website"})`;
    const adminHtml = `
      <h2>New Lead</h2>
      <p><b>Name:</b> ${esc(name)}</p>
      <p><b>Email:</b> ${esc(email)}</p>
      <p><b>Company:</b> ${esc(company)}</p>
      <p><b>Timeline:</b> ${esc(timeline)}</p>
      <p><b>Source:</b> ${esc(source)}</p>
      <hr />
      <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;">${esc(leadText)}</pre>
    `;

    const adminResult = await resendSend(apiKey, {
      from: FROM,
      to: [ADMIN_TO],
      subject: adminSubject,
      html: adminHtml,
      reply_to: email, // 你直接回复这封通知邮件就等于回客户
    });

    if (!adminResult.ok) {
      // 管理员都发不出去 → 这才算真正失败
      return res.status(200).json({
        ok: false,
        error: "Admin notify failed",
        detail: adminResult.detail,
      });
    }

    // ============ 2) 自动回复客户（失败也不影响 ok=true） ============
    // 这里是“高客单价定位”版本，你要改成你指定内容，就改 autoHtml 这段即可
    const autoSubject = "We received your request — ChinaExecution";
    const autoHtml = `
      <p>Hi${name ? " " + esc(name) : ""},</p>

      <p>Thanks for reaching out. We’ve received your request and will respond within <b>24 hours</b>.</p>

      <p><b>High-touch execution support (China-side)</b><br/>
      We focus on outcomes: supplier coordination, production follow-up, QC/inspection coordination, and logistics follow-up —
      with clear evidence and structured reporting.</p>

      <p><b>Fastest channel:</b> WhatsApp Business
      <a href="https://wa.me/19192131199">+1 919 213 1199</a></p>

      <p><b>To speed up quoting</b>, please reply with:
      <ul>
        <li>City / factory location (if known)</li>
        <li>Deadline / urgency</li>
        <li>Any links/files (product spec, supplier info)</li>
      </ul>
      </p>

      <p>If this is urgent, reply with <b>URGENT</b> + your deadline.</p>

      <hr/>
      <p><b>Your submission:</b></p>
      <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;">${esc(leadText)}</pre>

      <p style="opacity:.7;font-size:12px;">
        Bestoo Service LLC / ChinaExecution<br/>
        Email: info@chinaexecution.com | WhatsApp: +1 919 213 1199
      </p>
    `;

    const autoResult = await resendSend(apiKey, {
      from: FROM,
      to: [email],
      subject: autoSubject,
      html: autoHtml,
    });

    // 返回 200 + ok=true：只要管理员收到了，就不让前端弹错
    return res.status(200).json({
      ok: true,
      admin: adminResult.detail,
      auto_ok: autoResult.ok,
      auto_detail: autoResult.ok ? autoResult.detail : autoResult.detail, // 方便你在日志看原因
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
}

async function resendSend(apiKey, payload) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, detail: j };
  return { ok: true, detail: j };
}

function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
