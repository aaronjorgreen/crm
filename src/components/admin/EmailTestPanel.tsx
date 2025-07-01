import React, { useState } from 'react';
import { emailService } from '../../lib/email';
import { emailSetupGuide } from '../../lib/emailSetup';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Mail, Send, CheckCircle, AlertCircle, Copy, ExternalLink, Settings, Shield } from 'lucide-react';

const EmailTestPanel: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail) return;
    
    setSending(true);
    setResult(null);
    
    try {
      const response = await emailService.sendEmail({
        to: testEmail,
        subject: emailSetupGuide.testEmail.subject,
        html: emailSetupGuide.testEmail.html,
        text: emailSetupGuide.testEmail.text
      });
      
      setResult({
        success: response.success,
        message: response.success 
          ? 'Test email sent successfully! Check your inbox and spam folder.' 
          : response.error || 'Failed to send test email'
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while sending the test email'
      });
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-neutral-900">Email System Configuration</h3>
              <p className="text-neutral-600 mt-1">Configure team@innovatexlabs.com for platform communications</p>
              <div className="flex items-center space-x-2 mt-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Production-ready email infrastructure</span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            icon={Settings}
          >
            {showSetupGuide ? 'Hide' : 'Show'} Setup Guide
          </Button>
        </div>
      </div>

      {/* Setup Guide */}
      {showSetupGuide && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
          <div className="p-8 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100">
            <h4 className="text-xl font-bold text-neutral-900">📧 Complete Email Setup Guide</h4>
            <p className="text-neutral-600 mt-2">Follow these steps to configure team@innovatexlabs.com for production use</p>
          </div>
          
          <div className="p-8 space-y-8">
            {emailSetupGuide.steps.map((step, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-lg font-bold text-neutral-900">{step.title}</h5>
                    <p className="text-neutral-600 mt-2">{step.description}</p>
                    
                    {step.url && (
                      <a
                        href={step.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mt-3 font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open Google Account Settings</span>
                      </a>
                    )}
                    
                    {step.instructions && (
                      <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                        <p className="text-sm font-semibold text-neutral-700 mb-3">Step-by-step instructions:</p>
                        <ol className="text-sm text-neutral-600 space-y-2">
                          {step.instructions.map((instruction, i) => (
                            <li key={i} className="flex items-start space-x-3">
                              <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {step.envVars && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm font-semibold text-blue-700 mb-3">Supabase Environment Variables:</p>
                        <div className="space-y-3">
                          {Object.entries(step.envVars).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                              <code className="text-sm font-mono text-neutral-800 font-semibold">{key}</code>
                              <div className="flex items-center space-x-2">
                                <code className="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">{value}</code>
                                <button
                                  onClick={() => copyToClipboard(`${key}=${value}`)}
                                  className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {index < emailSetupGuide.steps.length - 1 && (
                  <div className="ml-5 w-0.5 h-6 bg-neutral-200"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Email Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-green-50 to-blue-50">
          <h4 className="text-xl font-bold text-neutral-900">🧪 Test Email System</h4>
          <p className="text-neutral-600 mt-1">Send a test email to verify your configuration is working</p>
        </div>
        
        <div className="p-8 space-y-6">
          <Input
            label="Test Email Address"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your-email@example.com"
            icon={Mail}
            fullWidth
            helperText="Enter your personal email address to receive the test email"
          />
          
          <Button
            onClick={handleSendTest}
            loading={sending}
            disabled={!testEmail || sending}
            icon={Send}
            variant="primary"
            size="lg"
            fullWidth
          >
            {sending ? 'Sending Test Email...' : 'Send Test Email'}
          </Button>
          
          {result && (
            <div className={`p-6 rounded-xl border-2 ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? '✅ Email Sent Successfully!' : '❌ Email Failed to Send'}
                  </div>
                  <div className={`mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </div>
                  {result.success && (
                    <div className="mt-3 text-sm text-green-600">
                      <p>✓ Check your inbox and spam folder</p>
                      <p>✓ Email system is ready for user invitations</p>
                      <p>✓ You can now create your first admin account</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Templates Preview */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h4 className="text-xl font-bold text-neutral-900">📧 Available Email Templates</h4>
          <p className="text-neutral-600 mt-1">Professional email templates ready for production use</p>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border border-neutral-200 rounded-xl hover:border-blue-300 transition-colors">
              <h5 className="font-bold text-neutral-900 mb-2">👤 User Invitations</h5>
              <p className="text-sm text-neutral-600 mb-3">Professional invites with role badges, security notices, and branded design</p>
              <div className="text-xs text-neutral-500">
                ✓ Role-based access levels • ✓ Secure invitation tokens • ✓ Expiration handling
              </div>
            </div>
            
            <div className="p-6 border border-neutral-200 rounded-xl hover:border-blue-300 transition-colors">
              <h5 className="font-bold text-neutral-900 mb-2">🔐 Password Resets</h5>
              <p className="text-sm text-neutral-600 mb-3">Secure reset links with expiration warnings and security best practices</p>
              <div className="text-xs text-neutral-500">
                ✓ Secure reset tokens • ✓ Time-limited access • ✓ Security notifications
              </div>
            </div>
            
            <div className="p-6 border border-neutral-200 rounded-xl hover:border-blue-300 transition-colors">
              <h5 className="font-bold text-neutral-900 mb-2">🎉 Welcome Messages</h5>
              <p className="text-sm text-neutral-600 mb-3">Onboarding emails with next steps, pro tips, and platform introduction</p>
              <div className="text-xs text-neutral-500">
                ✓ Onboarding guidance • ✓ Feature highlights • ✓ Getting started tips
              </div>
            </div>
            
            <div className="p-6 border border-neutral-200 rounded-xl hover:border-blue-300 transition-colors">
              <h5 className="font-bold text-neutral-900 mb-2">📋 Project Notifications</h5>
              <p className="text-sm text-neutral-600 mb-3">Updates for assignments, deadlines, completions, and team collaboration</p>
              <div className="text-xs text-neutral-500">
                ✓ Task assignments • ✓ Deadline reminders • ✓ Progress updates
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTestPanel;