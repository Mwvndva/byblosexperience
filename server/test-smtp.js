import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

async function testSMTP() {
  console.log('Testing SMTP connection...');
  
  // SMTP configuration
  const smtpConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    },
    debug: true,
    logger: true,
    // Additional debug options
    debug: (level, message) => {
      console.log(`[Nodemailer] ${level}: ${message}`);
    },
    // Force using TLSv1.2
    minVersion: 'TLSv1.2',
    // Add connection timeout
    connectionTimeout: 30000, // 30 seconds
    // Add greeting timeout
    greetingTimeout: 30000, // 30 seconds
    // Add socket timeout
    socketTimeout: 30000, // 30 seconds
    // Add DNS timeout
    dnsTimeout: 30000 // 30 seconds
  };

  console.log('SMTP Configuration:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: smtpConfig.auth.user
  });

  try {
    // Create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Add event listeners for debugging
    transporter.on('token', (token) => {
      console.log('A new access token was generated');
      console.log('User: %s', token.user);
      console.log('Access Token: %s', token.accessToken);
      console.log('Expires: %s', new Date(token.expires).toISOString());
    });
    
    // Verify connection configuration
    console.log('Verifying SMTP connection...');
    const verifyResult = await transporter.verify();
    console.log('✅ Server is ready to take our messages');
    console.log('Verify result:', verifyResult);
    
    // Send test email
    console.log('Sending test email to:', process.env.TEST_EMAIL || 'recipient@example.com');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
      to: process.env.TEST_EMAIL || 'recipient@example.com',
      subject: 'Test Email from Byblos',
      text: 'This is a test email from Byblos.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4a6baf;">Test Email from Byblos</h1>
          <p>This is a test email to verify the email sending functionality.</p>
          <p>If you're seeing this, the email service is working correctly!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('❌ Error sending test email:');
    console.error(error);
    
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    
    process.exit(1);
  }
}

// Run the test
testSMTP();
