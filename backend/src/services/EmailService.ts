import nodemailer from 'nodemailer';

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface EmailVerificationData {
  userEmail: string;
  firstName: string;
  verificationToken: string;
  verificationUrl: string;
}

export interface ClaimNotificationData {
  userEmail: string;
  firstName: string;
  listingTitle: string;
  claimId: string;
  statusUrl: string;
}

export interface WelcomeEmailData {
  userEmail: string;
  firstName: string;
  dashboardUrl: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  // Initialize email service with SMTP configuration
  static async initialize() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASSWORD || 'password',
      },
    };

    try {
      this.transporter = nodemailer.createTransporter(emailConfig);

      // Verify connection in production
      if (process.env.NODE_ENV === 'production') {
        await this.transporter.verify();
        console.log('Email service initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // In development/testing, create a test transporter
      if (process.env.NODE_ENV !== 'production') {
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: 'test@ethereal.email',
            pass: 'test123',
          },
        });
      }
    }
  }

  // Send email verification message
  static async sendEmailVerification(data: EmailVerificationData): Promise<boolean> {
    if (!this.transporter) {
      await this.initialize();
    }

    const template = this.generateEmailVerificationTemplate(data);

    try {
      const info = await this.transporter!.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@directoryai.com',
        to: data.userEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      console.log(`Email verification sent to ${data.userEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      return false;
    }
  }

  // Send claim status notification
  static async sendClaimNotification(data: ClaimNotificationData, status: 'approved' | 'rejected' | 'verified'): Promise<boolean> {
    if (!this.transporter) {
      await this.initialize();
    }

    const template = this.generateClaimNotificationTemplate(data, status);

    try {
      const info = await this.transporter!.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@directoryai.com',
        to: data.userEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      console.log(`Claim notification sent to ${data.userEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send claim notification:', error);
      return false;
    }
  }

  // Send welcome email
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.transporter) {
      await this.initialize();
    }

    const template = this.generateWelcomeTemplate(data);

    try {
      const info = await this.transporter!.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@directoryai.com',
        to: data.userEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      console.log(`Welcome email sent to ${data.userEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  // Send generic notification email
  static async sendNotification(
    to: string,
    subject: string,
    content: { text: string; html?: string }
  ): Promise<boolean> {
    if (!this.transporter) {
      await this.initialize();
    }

    try {
      const info = await this.transporter!.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@directoryai.com',
        to,
        subject,
        text: content.text,
        html: content.html || content.text.replace(/\n/g, '<br>'),
      });

      console.log(`Notification email sent to ${to}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send notification email:', error);
      return false;
    }
  }

  // Generate email verification template
  private static generateEmailVerificationTemplate(data: EmailVerificationData): EmailTemplate {
    const subject = 'Verify your email address';

    const text = `
Hi ${data.firstName},

Welcome to Directory AI! Please verify your email address by clicking the link below:

${data.verificationUrl}

This link will expire in 24 hours. If you didn't create an account with us, you can safely ignore this email.

Best regards,
The Directory AI Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Directory AI</h1>
    </div>
    <div class="content">
        <h2>Hi ${data.firstName},</h2>
        <p>Welcome to Directory AI! Please verify your email address to complete your account setup.</p>
        <div style="text-align: center;">
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
        </div>
        <p>This link will expire in 24 hours. If you didn't create an account with us, you can safely ignore this email.</p>
        <p>Best regards,<br>The Directory AI Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  // Generate claim notification template
  private static generateClaimNotificationTemplate(
    data: ClaimNotificationData,
    status: 'approved' | 'rejected' | 'verified'
  ): EmailTemplate {
    const statusMessages = {
      approved: {
        subject: 'Your listing claim has been approved',
        message: 'Great news! Your claim has been approved and you now have ownership of this listing.',
        color: '#28a745',
      },
      rejected: {
        subject: 'Your listing claim was not approved',
        message: 'We\'ve reviewed your claim submission and unfortunately cannot approve it at this time.',
        color: '#dc3545',
      },
      verified: {
        subject: 'Your listing claim has been verified',
        message: 'Excellent! Your verification evidence has been approved and your claim is now complete.',
        color: '#007bff',
      },
    };

    const statusInfo = statusMessages[status];
    const subject = statusInfo.subject;

    const text = `
Hi ${data.firstName},

${statusInfo.message}

Listing: ${data.listingTitle}
Claim ID: ${data.claimId}

You can view the full details and manage your listing at:
${data.statusUrl}

Best regards,
The Directory AI Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusInfo.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-badge { background: ${statusInfo.color}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: bold; text-transform: uppercase; }
        .listing-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${statusInfo.color}; }
        .button { display: inline-block; background: ${statusInfo.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Directory AI</h1>
        <div class="status-badge">${status.toUpperCase()}</div>
    </div>
    <div class="content">
        <h2>Hi ${data.firstName},</h2>
        <p>${statusInfo.message}</p>

        <div class="listing-info">
            <h3>Listing Details</h3>
            <p><strong>Title:</strong> ${data.listingTitle}</p>
            <p><strong>Claim ID:</strong> ${data.claimId}</p>
        </div>

        <div style="text-align: center;">
            <a href="${data.statusUrl}" class="button">View Details</a>
        </div>

        <p>Best regards,<br>The Directory AI Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  // Generate welcome email template
  private static generateWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const subject = 'Welcome to Directory AI!';

    const text = `
Hi ${data.firstName},

Welcome to Directory AI! Your account has been successfully created and verified.

You can now:
- Browse directory listings
- Claim ownership of your business listings
- Manage your profile and listings

Get started by visiting your dashboard:
${data.dashboardUrl}

If you have any questions, feel free to reach out to our support team.

Best regards,
The Directory AI Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .features { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .feature-item { margin: 10px 0; }
        .feature-item::before { content: "✓ "; color: #28a745; font-weight: bold; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to Directory AI!</h1>
    </div>
    <div class="content">
        <h2>Hi ${data.firstName},</h2>
        <p>Welcome to Directory AI! Your account has been successfully created and verified.</p>

        <div class="features">
            <h3>You can now:</h3>
            <div class="feature-item">Browse directory listings</div>
            <div class="feature-item">Claim ownership of your business listings</div>
            <div class="feature-item">Manage your profile and listings</div>
            <div class="feature-item">Connect with other businesses in your area</div>
        </div>

        <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
        </div>

        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Directory AI Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  // Test email configuration
  static async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      if (!this.transporter) {
        return { success: false, message: 'Email service not initialized' };
      }

      await this.transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      return {
        success: false,
        message: `Email configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Initialize email service on module load
EmailService.initialize().catch(console.error);