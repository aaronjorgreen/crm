import { supabase } from './supabase';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export const emailConfig = {
  from: 'team@innovatexlabs.com',
  replyTo: 'team@innovatexlabs.com',
  organization: 'Innovate X Labs',
  baseUrl: window.location.origin
};

export const emailTemplates = {
  userInvitation: (data: {
    firstName: string;
    inviterName: string;
    inviteUrl: string;
    role: string;
    expiresIn: string;
  }): EmailTemplate => ({
    subject: `You're invited to join ${emailConfig.organization}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${emailConfig.organization}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
            .role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to ${emailConfig.organization}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join our platform</p>
            </div>
            <div class="content">
              <p>Hi ${data.firstName || 'there'},</p>
              <p><strong>${data.inviterName}</strong> has invited you to join <strong>${emailConfig.organization}</strong> as a <span class="role-badge">${data.role.replace('_', ' ').toUpperCase()}</span>.</p>
              <p>Our platform helps teams collaborate more effectively with powerful project management tools, client management, and integrated workflows.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
              </div>
              <p><strong>Important:</strong> This invitation expires in ${data.expiresIn}. Please accept it soon to secure your access.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 14px; color: #666;">
                If you're having trouble with the button above, copy and paste this URL into your browser:<br>
                <a href="${data.inviteUrl}" style="color: #667eea; word-break: break-all;">${data.inviteUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 ${emailConfig.organization}. All rights reserved.</p>
              <p>This email was sent from an automated system. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to ${emailConfig.organization}!

Hi ${data.firstName || 'there'},

${data.inviterName} has invited you to join ${emailConfig.organization} as a ${data.role.replace('_', ' ').toUpperCase()}.

Accept your invitation: ${data.inviteUrl}

This invitation expires in ${data.expiresIn}.

© 2025 ${emailConfig.organization}
    `
  }),

  passwordReset: (data: {
    firstName: string;
    resetUrl: string;
    expiresIn: string;
  }): EmailTemplate => ({
    subject: `Reset your ${emailConfig.organization} password`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ${emailConfig.organization}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure your account</p>
            </div>
            <div class="content">
              <p>Hi ${data.firstName},</p>
              <p>We received a request to reset your password for your ${emailConfig.organization} account.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </div>
              <div class="warning">
                <strong>Security Notice:</strong> This link expires in ${data.expiresIn}. If you didn't request this reset, please ignore this email and your password will remain unchanged.
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 14px; color: #666;">
                If you're having trouble with the button above, copy and paste this URL into your browser:<br>
                <a href="${data.resetUrl}" style="color: #ff6b6b; word-break: break-all;">${data.resetUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 ${emailConfig.organization}. All rights reserved.</p>
              <p>This email was sent from an automated system. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Password Reset - ${emailConfig.organization}

Hi ${data.firstName},

We received a request to reset your password for your ${emailConfig.organization} account.

Reset your password: ${data.resetUrl}

This link expires in ${data.expiresIn}. If you didn't request this reset, please ignore this email.

© 2025 ${emailConfig.organization}
    `
  }),

  welcomeMessage: (data: {
    firstName: string;
    role: string;
    dashboardUrl: string;
  }): EmailTemplate => ({
    subject: `Welcome to ${emailConfig.organization}! 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${emailConfig.organization}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10ac84 0%, #00d2d3 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #10ac84 0%, #00d2d3 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
            .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .role-badge { background: #e8f5e8; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to the Team!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account is ready to go</p>
            </div>
            <div class="content">
              <p>Hi ${data.firstName},</p>
              <p>Congratulations! Your ${emailConfig.organization} account has been successfully created with <span class="role-badge">${data.role.replace('_', ' ').toUpperCase()}</span> access.</p>
              
              <div class="feature">
                <h3 style="margin: 0 0 10px 0; color: #10ac84;">🚀 What's Next?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Explore your personalized dashboard</li>
                  <li>Set up your profile and preferences</li>
                  <li>Connect with your team members</li>
                  <li>Start collaborating on projects</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
              </div>

              <div class="feature">
                <h3 style="margin: 0 0 10px 0; color: #10ac84;">💡 Pro Tips</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Bookmark your dashboard for quick access</li>
                  <li>Enable browser notifications for real-time updates</li>
                  <li>Check out the help section for tutorials</li>
                </ul>
              </div>

              <p>If you have any questions or need assistance, don't hesitate to reach out to our team at <a href="mailto:${emailConfig.from}" style="color: #10ac84;">${emailConfig.from}</a>.</p>
            </div>
            <div class="footer">
              <p>© 2025 ${emailConfig.organization}. All rights reserved.</p>
              <p>Need help? Contact us at <a href="mailto:${emailConfig.from}" style="color: #10ac84;">${emailConfig.from}</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to ${emailConfig.organization}! 🎉

Hi ${data.firstName},

Congratulations! Your ${emailConfig.organization} account has been successfully created with ${data.role.replace('_', ' ').toUpperCase()} access.

What's Next?
- Explore your personalized dashboard
- Set up your profile and preferences  
- Connect with your team members
- Start collaborating on projects

Go to Dashboard: ${data.dashboardUrl}

Pro Tips:
- Bookmark your dashboard for quick access
- Enable browser notifications for real-time updates
- Check out the help section for tutorials

Need help? Contact us at ${emailConfig.from}

© 2025 ${emailConfig.organization}
    `
  }),

  projectNotification: (data: {
    firstName: string;
    projectName: string;
    notificationType: 'assigned' | 'deadline' | 'update' | 'completed';
    message: string;
    actionUrl?: string;
  }): EmailTemplate => ({
    subject: `Project Update: ${data.projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Update - ${emailConfig.organization}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #5f27cd 0%, #341f97 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #5f27cd 0%, #341f97 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
            .notification { background: #f0f4ff; border-left: 4px solid #5f27cd; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">📋 Project Update</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.projectName}</p>
            </div>
            <div class="content">
              <p>Hi ${data.firstName},</p>
              <div class="notification">
                <h3 style="margin: 0 0 10px 0; color: #5f27cd;">
                  ${data.notificationType === 'assigned' ? '👤 New Assignment' :
                    data.notificationType === 'deadline' ? '⏰ Deadline Reminder' :
                    data.notificationType === 'update' ? '📝 Project Update' :
                    '✅ Project Completed'}
                </h3>
                <p style="margin: 0;">${data.message}</p>
              </div>
              ${data.actionUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.actionUrl}" class="button">View Project</a>
                </div>
              ` : ''}
              <p>Stay updated with all your project activities through your dashboard.</p>
            </div>
            <div class="footer">
              <p>© 2025 ${emailConfig.organization}. All rights reserved.</p>
              <p>Manage your notification preferences in your <a href="${emailConfig.baseUrl}/settings" style="color: #5f27cd;">account settings</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Project Update: ${data.projectName}

Hi ${data.firstName},

${data.notificationType === 'assigned' ? 'New Assignment' :
  data.notificationType === 'deadline' ? 'Deadline Reminder' :
  data.notificationType === 'update' ? 'Project Update' :
  'Project Completed'}

${data.message}

${data.actionUrl ? `View Project: ${data.actionUrl}` : ''}

© 2025 ${emailConfig.organization}
    `
  })
};

export const emailService = {
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      // In a real implementation, this would integrate with your email service
      // For now, we'll use Supabase Edge Functions or a third-party service
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailData.to,
          from: emailData.from || emailConfig.from,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        }
      });

      if (error) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Email service error:', error);
      return { success: false, error: error.message };
    }
  },

  async sendInvitation(data: {
    email: string;
    firstName: string;
    inviterName: string;
    inviteUrl: string;
    role: string;
    expiresIn: string;
  }): Promise<{ success: boolean; error?: string }> {
    const template = emailTemplates.userInvitation(data);
    return this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  },

  async sendPasswordReset(data: {
    email: string;
    firstName: string;
    resetUrl: string;
    expiresIn: string;
  }): Promise<{ success: boolean; error?: string }> {
    const template = emailTemplates.passwordReset(data);
    return this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  },

  async sendWelcomeMessage(data: {
    email: string;
    firstName: string;
    role: string;
    dashboardUrl: string;
  }): Promise<{ success: boolean; error?: string }> {
    const template = emailTemplates.welcomeMessage(data);
    return this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  },

  async sendProjectNotification(data: {
    email: string;
    firstName: string;
    projectName: string;
    notificationType: 'assigned' | 'deadline' | 'update' | 'completed';
    message: string;
    actionUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const template = emailTemplates.projectNotification(data);
    return this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
};