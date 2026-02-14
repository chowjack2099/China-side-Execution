import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, message } = req.body;

    // 1️⃣ 给你自己发通知
    await resend.emails.send({
      from: 'China Execution <info@chinaexecution.com>',
      to: 'info@chinaexecution.com',
      subject: 'New Client Inquiry',
      html: `
        <h2>New Inquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    // 2️⃣ 自动回复客户
    await resend.emails.send({
      from: 'China Execution <info@chinaexecution.com>',
      to: email,
      subject: 'We Received Your Inquiry',
      html: `
        <h2>Thank you ${name},</h2>
        <p>We have received your request and our team will contact you shortly.</p>
        <p>If urgent, please contact us:</p>
        <p><strong>WhatsApp Business:</strong> +1 919 213 1199</p>
        <br/>
        <p>Best regards,<br/>China Execution Team</p>
      `,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
