/**
 * Mail Service - Phase 1 (Production Readiness)
 * 
 * Handles email notifications, invites, and room summaries.
 */

import nodemailer from 'nodemailer';
import logger from '../logger.js';

class MailService {
  constructor() {
    this.enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    
    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('[MailService] SMTP Configured. Emails will be sent via ' + process.env.SMTP_HOST);
    } else {
        logger.warn('[MailService] SMTP Not Configured. Emails will be logged to console.');
    }
  }

  /**
   * Send an email invite to join a room
   * @param {string} to - Recipient email
   * @param {Object} data - { roomName, hostName, inviteLink }
   */
  async sendRoomInvite(to, data) {
    const subject = `${data.hostName} invited you to join ${data.roomName} on Cospira`;
    const body = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4f46e5;">Join the Arena</h1>
        <p style="font-size: 16px;">${data.hostName} is waiting for you in <b>${data.roomName}</b>.</p>
        <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace;">Room ID: ${data.roomId}</p>
        <div style="margin: 30px 0;">
            <a href="${data.inviteLink}" style="padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Join Now</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you don't have Cospira installed, your browser will open the web version.</p>
      </div>
    `;

    return this.sendEmail(to, subject, body);
  }

  /**
   * Send meeting summary after session ends
   */
  async sendMeetingSummary(to, summary) {
    const subject = `Cospira Recap: ${summary.roomName}`;
    const body = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Meeting Summary</h1>
          <p>Here is the recap of your session on ${new Date(summary.date).toLocaleDateString()}.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
            ${summary.text}
          </div>
          <h3>Action Items:</h3>
          <ul>
            ${summary.actionItems.map(item => `<li>${item}</li>`).join('')}
          </ul>
      </div>
    `;

    return this.sendEmail(to, subject, body);
  }

  /**
   * Core send method
   */
  async sendEmail(to, subject, html) {
    logger.info(`[MailService] Sending email to ${to}: "${subject}"`);
    
    if (!this.enabled) {
      logger.warn(`[MailService] SMTP not configured. Email logged to console instead of sent.`);
      logger.info(`\n=== EMAIL CONTENT START ===\n${html}\n=== EMAIL CONTENT END ===\n`);
      // Mock success for development
      return { success: true, mocked: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `Cospira <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });

      logger.info(`[MailService] Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
       logger.error(`[MailService] Failed to send email: ${error.message}`);
       return { success: false, error: error.message };
    }
  }
}

export default new MailService();
