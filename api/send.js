export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, company, timeline, details } = req.body;

    if (!name || !email || !details) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: "API key not configured" });
    }

    // 1️⃣ 给你自己发通知邮件
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ChinaExecution <info@chinaexecution.com>",
        to: ["info@chinaexecution.com"], // 改成你想收件的邮箱
        subject: "New Lead — China Execution Support",
        html: `
          <h2>New Lead Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || "-"}</p>
          <p><strong>Timeline:</strong> ${timeline || "-"}</p>
          <p><strong>Details:</strong></p>
          <p>${details}</p>
        `,
      }),
    });

    // 2️⃣ 自动回复客户
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ChinaExecution <info@chinaexecution.com>",
        to: [email],
        subject: "We received your request — ChinaExecution",
        html: `
          <p>Hi ${name},</p>
          <p>Thank you for reaching out. We have received your request and will review it shortly.</p>
          <p>We typically respond within 24 hours.</p>
          <p>If your matter is urgent, feel free to reply directly to this email.</p>
          <br/>
          <p>Best regards,<br/>
          ChinaExecution Team<br/>
          Operated by Bestoo Service LLC</p>
        `,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("SEND ERROR:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
