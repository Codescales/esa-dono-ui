import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendMagicLink(email, token) {
  const url = `${process.env.APP_BASE_URL}/wallet?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Donation Platform <no-reply@example.com>',
    to: email,
    subject: 'Your Donation Wallet Link',
    html: `
      <h2>Thank you for your donation!</h2>
      <p>Click the link below to access your wallet and spend your balance on rewards, polls, and goals:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link is valid for 30 days.</p>
    `,
  });
}
