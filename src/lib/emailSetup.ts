// Email Setup Guide and Configuration
export const emailSetupGuide = {
  steps: [
    {
      title: "1. Enable 2-Factor Authentication",
      description: "Go to your Google Account settings and enable 2FA for team@innovatexlabs.com",
      url: "https://myaccount.google.com/security",
      instructions: [
        "Sign in to team@innovatexlabs.com Google Account",
        "Go to Security settings",
        "Enable 2-Step Verification",
        "Choose your preferred 2FA method (SMS, Authenticator app, etc.)"
      ]
    },
    {
      title: "2. Generate App Password",
      description: "Create an app-specific password for the email service",
      instructions: [
        "Go to Google Account > Security > 2-Step Verification",
        "Scroll down to 'App passwords'",
        "Select 'Mail' and 'Other (custom name)'",
        "Enter 'Innovate X Labs Platform'",
        "Copy the generated 16-character password",
        "Save this password securely - you'll need it for Supabase configuration"
      ]
    },
    {
      title: "3. Configure Supabase Environment Variables",
      description: "Add email credentials to your Supabase project settings",
      envVars: {
        GMAIL_USERNAME: "team@innovatexlabs.com",
        GMAIL_APP_PASSWORD: "your-16-character-app-password-here",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "587"
      },
      instructions: [
        "Go to your Supabase project dashboard",
        "Navigate to Settings > Edge Functions",
        "Add the environment variables listed above",
        "Make sure to use the app password, not your regular Gmail password"
      ]
    },
    {
      title: "4. Test Email Configuration",
      description: "Verify the email system is working correctly",
      instructions: [
        "Use the test email feature below",
        "Send a test email to your personal email",
        "Check that the email is received and properly formatted",
        "Verify the sender shows as 'team@innovatexlabs.com'"
      ]
    }
  ],
  
  testEmail: {
    subject: "🎉 Innovate X Labs Email System Test - Configuration Complete",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Email System Active!</h1>
          <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">team@innovatexlabs.com is ready for production</p>
        </div>
        <div style="padding: 40px 30px; background: white; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">🚀 Email System Capabilities</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">✨ Now Ready For:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.6;">
              <li><strong>User Invitations</strong> - Secure invitation emails with role-based access</li>
              <li><strong>Password Resets</strong> - Secure password reset links with expiration</li>
              <li><strong>Welcome Messages</strong> - Professional onboarding emails for new users</li>
              <li><strong>Project Notifications</strong> - Task assignments, deadlines, and updates</li>
              <li><strong>System Alerts</strong> - Important platform notifications and announcements</li>
              <li><strong>Client Communications</strong> - Professional correspondence tracking</li>
            </ul>
          </div>
          
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">🔒 Security Features</h3>
            <ul style="margin: 0; padding-left: 20px; color: #047857; line-height: 1.6;">
              <li>App-specific password authentication</li>
              <li>Secure SMTP over TLS (port 587)</li>
              <li>Professional sender reputation</li>
              <li>Email delivery tracking and logging</li>
            </ul>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">📋 Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; color: #b45309; line-height: 1.6;">
              <li>Create your first admin user via invitation</li>
              <li>Set up workspace and client management</li>
              <li>Configure Google OAuth for full email integration</li>
              <li>Enable AI-powered email processing</li>
            </ol>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <div style="text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This test was sent from your Innovate X Labs CRM platform<br>
              <strong>team@innovatexlabs.com</strong> • Powered by Vertex Vista
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Email System Test - Innovate X Labs CRM

✅ Email system is now active and ready for production!

Capabilities:
- User Invitations with role-based access
- Password Resets with secure links
- Welcome Messages for new users  
- Project Notifications and updates
- System Alerts and announcements
- Client Communications tracking

Security Features:
- App-specific password authentication
- Secure SMTP over TLS
- Professional sender reputation
- Email delivery tracking

Next Steps:
1. Create your first admin user via invitation
2. Set up workspace and client management
3. Configure Google OAuth for full email integration
4. Enable AI-powered email processing

This test was sent from team@innovatexlabs.com
Innovate X Labs CRM • Powered by Vertex Vista
    `
  }
};

export const emailValidation = {
  validateEmailAddress: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  validateDomain: (email: string, allowedDomains?: string[]): boolean => {
    if (!allowedDomains) return true;
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  },
  
  sanitizeEmailContent: (content: string): string => {
    // Remove potentially harmful content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
};

export const emailAnalytics = {
  trackEmailSent: async (type: string, recipient: string) => {
    // Track email sending for analytics
    console.log(`Email sent: ${type} to ${recipient}`);
  },
  
  trackEmailOpened: async (emailId: string) => {
    // Track email opens (requires pixel tracking)
    console.log(`Email opened: ${emailId}`);
  },
  
  trackEmailClicked: async (emailId: string, linkUrl: string) => {
    // Track link clicks in emails
    console.log(`Email link clicked: ${emailId} -> ${linkUrl}`);
  }
};