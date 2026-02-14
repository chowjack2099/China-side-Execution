export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: "Missing RESEND_API_KEY" });

    // 兼容：JSON / 表单（Vercel通常已解析到 req.body）
    const data = req.body || {};

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const company = String(data.company || "").trim();
    const timeline = String(data.timeline || "").trim();
    const source = String(data.source || "website").trim();

    // ✅ 关键：兼容 details / message 两种字段名
    const details = String(data.details || data.message || "").trim();

    // ✅ name 允许为空（有些表单只有email+message）
    if (!email || !details) {
      return res.status(400).json({ ok: false, error: "Missing email or details", got: { hasEmail: !!email, hasDetails: !!details } });
    }

    // 1) 发给你（通知）
    const adminResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ChinaExecution <info@chinaexecution.com>",
        to: ["info@chinaexecution.com"],
        reply_to: email,
        subject: `New Lead (${source}) — ChinaExecution`,
        text:
`Name: ${name || "-"}
Email: ${email}
Company: ${company || "-"}
Timeline: ${timeline || "-"}
Source: ${source}

Details:
${details}
`,
      }),
    });

    if (!adminResp.ok) {
      const t = await adminResp.text();
      return res.status(500).json({ ok: false, error: "Admin email failed", detail: t });
    }

    // 2) 自动回复客户
    const userResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ChinaExecution <info@chinaexecution.com>",
        to: [email],
        reply_to: "info@chinaexecution.com",
        subject: "We received your request — ChinaExecution",
        text:
`Hi${name ? " " + name : ""},

Thanks for reaching out. We received your request and will reply within 24 hours.

Urgent? WhatsApp Business: +1 919 213 1199

— ChinaExecution
info@chinaexecution.com
`,
      }),
    });

    if (!userResp.ok) {
      const t = await userResp.text();
      return res.status(500).json({ ok: false, error: "Auto-reply failed", detail: t });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err?.message || "Internal error" });
  }
}
