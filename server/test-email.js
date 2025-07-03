import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from './src/utils/email.js';
import { readFile } from 'fs/promises';
import QRCode from 'qrcode';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

// Log email configuration for debugging
console.log('Email Configuration:');
console.log({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE,
  username: process.env.EMAIL_USERNAME,
  fromEmail: process.env.EMAIL_FROM_EMAIL,
  fromName: process.env.EMAIL_FROM_NAME
});

// Test email function
async function testEmail() {
  try {
    console.log('Starting email test...');
    
    // Generate a test QR code
    const qrCodeData = JSON.stringify({
      ticketNumber: 'TEST-12345',
      event: 'Test Event',
      customer: 'Test User',
      email: 'recipient@example.com'
    });
    
    const qrCode = await QRCode.toDataURL(qrCodeData);
    
    // Read email template
    const templatePath = path.join(__dirname, 'email-templates', 'ticket-confirmation.ejs');
    let template = await readFile(templatePath, 'utf-8');
    
    // Render template with test data
    const templateData = {
      ticketNumber: 'TEST-12345',
      customerName: 'Test User',
      customerEmail: 'recipient@example.com',
      eventName: 'Test Event',
      ticketType: 'General Admission',
      price: 50,
      purchaseDate: new Date().toLocaleString(),
      qrCode: qrCode,
      appName: process.env.APP_NAME || 'Byblos Experience',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@byblos.com',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    };
    
    // Replace EJS variables manually for this simple test
    let html = template;
    for (const [key, value] of Object.entries(templateData)) {
      html = html.replace(new RegExp(`<%= ${key} %>`, 'g'), value);
    }
    
    // Send test email
    console.log('Sending test email...');
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
      to: 'recipient@example.com', // Replace with your test email
      subject: 'Test Email from Byblos Experience',
      html: html,
      text: `Test email with ticket details:\n\n` +
            `Ticket Number: ${templateData.ticketNumber}\n` +
            `Event: ${templateData.eventName}\n` +
            `Ticket Type: ${templateData.ticketType}\n` +
            `Price: $${templateData.price}\n` +
            `Purchase Date: ${templateData.purchaseDate}`
    };
    
    await sendEmail(mailOptions);
    console.log('✅ Test email sent successfully!');
    
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
testEmail();
