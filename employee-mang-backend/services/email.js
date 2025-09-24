const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Use environment variables with fallback values
      const emailUser = process.env.EMAIL_USER || 'unvraviteja@gmail.com';
      const emailPassword = process.env.EMAIL_PASSWORD || 'gahw xfst jkur mvai';
      
      if (!emailUser || !emailPassword) {
        console.error('Email credentials not configured');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email transporter verification failed:', error);
        } else {
          console.log('Email server is ready to take messages');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@expense-claim-system.com',
        to,
        subject,
        text: text || this.htmlToText(html),
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', to, 'Message ID:', result.messageId);
      return result;
    } catch (error) {
      console.error('Email sending failed to:', to, 'Error:', error);
      throw error;
    }
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  async sendNotificationEmail(userEmail, notification) {
    const subject = `Notification: ${notification.title}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #fff; }
          .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
          .badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white; 
            font-size: 12px; 
            margin-bottom: 10px;
          }
          .info { background-color: #17a2b8; }
          .success { background-color: #28a745; }
          .warning { background-color: #ffc107; color: #000; }
          .danger { background-color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Expense Claim System Notification</h2>
          </div>
          <div class="content">
            <span class="badge ${notification.type}">${notification.type.toUpperCase()}</span>
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
            <p><strong>Date:</strong> ${new Date(notification.createdAt).toLocaleString()}</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Expense Claim System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html);
  }
}

module.exports = new EmailService();