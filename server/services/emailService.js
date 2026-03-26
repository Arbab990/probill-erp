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
export const sendForgotPasswordEmail = async ({ to, name, resetUrl }) => {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: `"ProBill ERP" <${process.env.EMAIL_USER || 'no-reply@probill.local'}>`,
    to,
    subject: 'Reset your ProBill ERP password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px; border-radius: 12px;">
        <div style="background: #0F172A; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="color: #6366F1; margin: 0; font-size: 24px;">ProBill ERP</h1>
          <p style="color: #94A3B8; margin: 8px 0 0;">Password Reset Request</p>
        </div>
        <h2 style="color: #1E293B;">Hello ${name},</h2>
        <p style="color: #475569;">We received a request to reset your password. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #6366F1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #94A3B8; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">Or copy this link: <a href="${resetUrl}" style="color: #6366F1;">${resetUrl}</a></p>
        <p style="color: #94A3B8; font-size: 12px;">Sent via ProBill ERP</p>
      </div>
    `,
  });

  if (!process.env.EMAIL_HOST) {
    console.log('📧 Password Reset Email (mock). Preview URL: %s', require('nodemailer').getTestMessageUrl(info));
  }
};

export const sendDunningEmail = async ({ to, customerName, invoiceNo, balanceDue, daysOverdue, dueDate, companyName }) => {
    const transporter = await createTransporter();
    const urgency = daysOverdue > 60 ? 'URGENT: ' : daysOverdue > 30 ? 'Reminder: ' : '';
    const subject = `${urgency}Invoice ${invoiceNo} — Payment Overdue by ${daysOverdue} Day${daysOverdue !== 1 ? 's' : ''}`;

    await transporter.sendMail({
        from: `"${companyName}" <${process.env.EMAIL_USER || 'no-reply@probill.local'}>`,
        to,
        subject,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px; border-radius: 12px;">
        <div style="background: #0F172A; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="color: ${daysOverdue > 60 ? '#ef4444' : '#f59e0b'}; margin: 0; font-size: 22px;">${companyName}</h1>
          <p style="color: #94A3B8; margin: 8px 0 0; font-size: 13px;">Payment Reminder</p>
        </div>
        <p style="color: #1E293B; font-size: 16px;">Dear <strong>${customerName}</strong>,</p>
        <p style="color: #475569;">This is a reminder that the following invoice is <strong style="color: ${daysOverdue > 30 ? '#ef4444' : '#f59e0b'}">overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</strong>.</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 13px;">Invoice Number</td><td style="font-family: monospace; font-weight: bold; color: #1e293b; font-size: 13px;">${invoiceNo}</td></tr>
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 13px;">Due Date</td><td style="font-family: monospace; color: #1e293b; font-size: 13px;">${new Date(dueDate).toLocaleDateString('en-IN')}</td></tr>
            <tr><td style="color: #64748b; padding: 6px 0; font-size: 13px;">Days Overdue</td><td style="font-family: monospace; color: #ef4444; font-weight: bold; font-size: 13px;">${daysOverdue} days</td></tr>
            <tr style="border-top: 2px solid #e2e8f0;"><td style="color: #1e293b; padding: 10px 0 4px; font-weight: bold;">Amount Due</td><td style="font-family: monospace; font-weight: bold; color: #ef4444; font-size: 18px;">₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>
        <p style="color: #475569;">Please arrange payment at your earliest convenience to avoid any service disruption.</p>
        <p style="color: #475569;">If you have already made this payment, please disregard this reminder and share the payment reference with us.</p>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">This is an automated reminder from ${companyName}.</p>
      </div>
    `,
    });
};