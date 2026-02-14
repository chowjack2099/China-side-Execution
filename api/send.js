import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {
    const { name, email, company, timeline, details, message, source } = req.body;

    const taskDetails = details || message || "No details provided.";

    // =========================
    // 1️⃣ 通知你自己
    // =========================
    await resend.emails.send({
      from: "ChinaExecution <info@chinaexecution.com>",
      to: "info@chinaexecution.com",
      subject: "New Lead — ChinaExecution Website",
      html: `
        <h2>New Lead Received</h2>
        <p><strong>Name:</strong> ${name || "N/A"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Timeline:</strong> ${timeline || "N/A"}</p>
        <p><strong>Source:</strong> ${source || "website"}</p>
        <hr/>
        <p><strong>Details:</strong></p>
        <p>${taskDetails}</p>
      `
    });

    // =========================
    // 2️⃣ 自动回复客户
    // =========================
    await resend.emails.send({
      from: "ChinaExecution <info@chinaexecution.com>",
      to: email,
      subject: "We Received Your Request — ChinaExecution",
      html: `
        <p>Thank you for contacting <strong>ChinaExecution</strong>.</p>

        <p>We have received your request for China-side operational support.</p>

        <p>Our team will conduct an initial assessment and respond within 24 hours regarding feasibility, scope alignment, and next steps.</p>

        <p>To ensure an efficient evaluation, please reply with:</p>

        <ul>
          <li>City or region in China involved</li>
          <li>Project timeline or deadline</li>
          <li>Nature of execution required (factory coordination, supplier escalation, on-site inspection, documentation handling, etc.)</li>
          <li>Key stakeholders or supplier contact details (if available)</li>
        </ul>

        <p>ChinaExecution provides structured, on-the-ground execution support in China for overseas companies. We specialize in operational follow-through, supplier-side coordination, and real-world issue resolution with professional English reporting.</p>

        <p><strong>Please note:</strong> We prioritize engagements requiring direct execution, coordination, or intervention on the ground in China.</p>

        <hr/>

        <p><strong>Official Contact:</strong></p>
        <p>Email: info@chinaexecution.com<br/>
        Website: https://www.chinaexecution.com<br/>
        WhatsApp Business: https://wa.me/19192131199</p>

        <p>We confirm scope and feasibility before proceeding with any engagement.</p>

        <p>Best regards,<br/>
        <strong>ChinaExecution Team</strong><br/>
        Operational Execution & Coordination in China</p>
      `
    });

    // ✅ 必须返回 success:true
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false });
  }
}
