import nodemailer from 'nodemailer';

let testAccount = null;

const createTransporter = async () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback to Ethereal Email for development
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
    console.log('Created Ethereal test email account:', testAccount.user);
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

export const sendInvoiceEmail = async ({ to, invoiceNo, companyName, total, dueDate, pdfBuffer }) => {
  const transporter = await createTransporter();
  const formattedTotal = `₹${Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formattedDue = dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

  const info = await transporter.sendMail({
    from: `"${companyName}" <${process.env.EMAIL_USER || 'no-reply@probill.local'}>`,
    to,
    subject: `Invoice ${invoiceNo} from ${companyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px; border-radius: 12px;">
        <div style="background: #0F172A; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="color: #6366F1; margin: 0; font-size: 24px;">ProBill ERP</h1>
          <p style="color: #94A3B8; margin: 8px 0 0;">Invoice Notification</p>
        </div>
        <h2 style="color: #1E293B;">Invoice ${invoiceNo}</h2>
        <p style="color: #475569;">Please find your invoice attached to this email.</p>
        <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr><td style="color: #64748B; padding: 6px 0;">Invoice Number</td><td style="font-weight: bold; text-align: right;">${invoiceNo}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Amount Due</td><td style="font-weight: bold; color: #6366F1; text-align: right;">${formattedTotal}</td></tr>
            <tr><td style="color: #64748B; padding: 6px 0;">Due Date</td><td style="font-weight: bold; text-align: right;">${formattedDue}</td></tr>
          </table>
        </div>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">Sent via ProBill ERP · ${companyName}</p>
      </div>
    `,
    attachments: pdfBuffer ? [{ filename: `${invoiceNo}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : [],
  });

  if (!process.env.EMAIL_HOST) {
    console.log('📧 Mock Email Sent! Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

export const sendVendorWelcomeEmail = async ({ to, vendorName, companyName }) => {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: `"${companyName}" <${process.env.EMAIL_USER || 'no-reply@probill.local'}>`,
    to,
    subject: `You've been added as a vendor — ${companyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2>Hello ${vendorName},</h2>
        <p>You have been registered as a vendor with <strong>${companyName}</strong> on ProBill ERP.</p>
        <p>You will receive invoices and payment notifications at this email address.</p>
        <p style="color: #94A3B8; font-size: 12px;">Sent via ProBill ERP</p>
      </div>
    `,
  });

  if (!process.env.EMAIL_HOST) {
    console.log('📧 Mock Email Sent! Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};