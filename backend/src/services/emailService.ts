import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Skip sending if no SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('📧 Email not sent - SMTP credentials not configured')
        console.log(`📧 Would send to: ${options.to}`)
        console.log(`📧 Subject: ${options.subject}`)
        return true
      }

      const mailOptions = {
        from: `"Logiketo" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      }

      await this.transporter.sendMail(mailOptions)
      console.log(`✅ Email sent successfully to ${options.to}`)
      return true
    } catch (error) {
      console.error('❌ Error sending email:', error)
      return false
    }
  }

  // Send notification to admin about new user registration
  async sendNewUserNotification(adminEmail: string, userData: {
    firstName: string
    lastName: string
    email: string
    role: string
  }): Promise<boolean> {
    const subject = `New User Registration - ${userData.firstName} ${userData.lastName}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New User Registration</h2>
        <p>A new user has registered and is waiting for approval:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">User Details:</h3>
          <p><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Role:</strong> ${userData.role}</p>
        </div>
        
        <p>Please review and approve this user in the admin panel:</p>
        <a href="${process.env.FRONTEND_URL}/admin" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Go to Admin Panel
        </a>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated notification from Logiketo.
        </p>
      </div>
    `

    return this.sendEmail({
      to: adminEmail,
      subject,
      html
    })
  }

  // Send approval notification to user
  async sendApprovalNotification(userEmail: string, userData: {
    firstName: string
    lastName: string
  }): Promise<boolean> {
    const subject = `Account Approved - Welcome to Logiketo!`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Account Approved!</h2>
        <p>Hello ${userData.firstName},</p>
        
        <p>Great news! Your Logiketo account has been approved and you can now access the platform.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="margin-top: 0; color: #059669;">Next Steps:</h3>
          <p>1. Visit the Logiketo platform</p>
          <p>2. Login with your credentials</p>
          <p>3. Start managing your logistics operations</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL}/login" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Login to Logiketo
        </a>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Welcome to Logiketo! If you have any questions, please contact support.
        </p>
      </div>
    `

    return this.sendEmail({
      to: userEmail,
      subject,
      html
    })
  }

  // Send rejection notification to user
  async sendRejectionNotification(userEmail: string, userData: {
    firstName: string
    lastName: string
  }): Promise<boolean> {
    const subject = `Account Application - Not Approved`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Application Not Approved</h2>
        <p>Hello ${userData.firstName},</p>
        
        <p>Thank you for your interest in Logiketo. Unfortunately, your account application has not been approved at this time.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #dc2626;">
            If you believe this is an error or would like to reapply, please contact our support team.
          </p>
        </div>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Thank you for your understanding.
        </p>
      </div>
    `

    return this.sendEmail({
      to: userEmail,
      subject,
      html
    })
  }
}

export const emailService = new EmailService()