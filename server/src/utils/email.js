import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Read email templates
const readTemplate = async (templateName, data) => {
  const templatePath = join(__dirname, `../../email-templates/${templateName}.ejs`);
  const template = fs.readFileSync(templatePath, 'utf-8');
  return ejs.render(template, data);
};

export const sendEmail = async (options) => {
  try {
    console.log('Preparing to send email with options:', {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasText: !!options.text,
      attachmentCount: options.attachments ? options.attachments.length : 0
    });

    // Verify required environment variables
    const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USERNAME', 'EMAIL_PASSWORD', 'EMAIL_FROM_EMAIL', 'EMAIL_FROM_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
      // Add debug info
      headers: {
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Precedence': 'bulk'
      }
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text,
      attachmentCount: mailOptions.attachments.length
    });

    // Test the connection first
    try {
      console.log('Testing SMTP connection...');
      const isConnected = await transporter.verify();
      console.log('SMTP connection verified:', isConnected);
    } catch (verifyError) {
      console.error('SMTP connection verification failed:', {
        message: verifyError.message,
        code: verifyError.code,
        command: verifyError.command
      });
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log email sending success
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      envelope: info.envelope,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      response: info.response
    });
    
    return info;
  } catch (error) {
    console.error('Error sending email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      responseMessage: error.responseMessage,
      stack: error.stack
    });
    
    // Rethrow with more context
    const errorMessage = `Failed to send email: ${error.message}`;
    error.message = errorMessage;
    throw error;
  }
};

export const sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const html = await readTemplate('verify-email', {
      verificationUrl,
      appName: process.env.APP_NAME || 'Byblos',
    });

    await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, token) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const html = await readTemplate('reset-password', {
      resetUrl,
      appName: process.env.APP_NAME || 'Byblos',
    });

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
      text: `You requested a password reset. Please click on the following link to reset your password: ${resetUrl}`,
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (email, name) => {
  try {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    
    const html = await readTemplate('welcome', {
      name,
      loginUrl,
      appName: process.env.APP_NAME || 'Byblos',
    });

    await sendEmail({
      to: email,
      subject: 'Welcome to Byblos',
      html,
      text: `Welcome to Byblos, ${name}! You can now log in to your account and start creating events.`,
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};
