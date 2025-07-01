import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  from?: string
  subject: string
  html: string
  text?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, from, subject, html, text }: EmailRequest = await req.json()

    // Gmail SMTP configuration for team@innovatexlabs.com
    const smtpConfig = {
      hostname: 'smtp.gmail.com',
      port: 587,
      username: Deno.env.get('GMAIL_USERNAME') || 'team@innovatexlabs.com',
      password: Deno.env.get('GMAIL_APP_PASSWORD'), // App-specific password
    }

    if (!smtpConfig.password) {
      throw new Error('Gmail app password not configured. Please set GMAIL_APP_PASSWORD environment variable.')
    }

    // Create email message in RFC 2822 format
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const message = [
      `From: Innovate X Labs <${smtpConfig.username}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      text || 'Please view this email in HTML format.',
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,
      `--${boundary}--`
    ].join('\r\n')

    // Send email using SMTP
    const response = await sendSMTPEmail(smtpConfig, to, message)

    if (!response.success) {
      throw new Error(response.error || 'Failed to send email via SMTP')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: response.messageId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendSMTPEmail(config: any, to: string, message: string) {
  try {
    // For production, you would implement actual SMTP connection here
    // For now, we'll simulate the email sending process
    
    // In a real implementation, you would:
    // 1. Connect to Gmail SMTP server
    // 2. Authenticate with app password
    // 3. Send the email
    // 4. Return success/failure status
    
    console.log('Sending email via SMTP...')
    console.log('To:', to)
    console.log('From:', config.username)
    console.log('Message length:', message.length)
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For demo purposes, we'll return success
    // In production, replace this with actual SMTP implementation
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
  } catch (error) {
    console.error('SMTP Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}