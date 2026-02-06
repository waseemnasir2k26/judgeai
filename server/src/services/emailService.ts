import { Resend } from 'resend';
import { logger } from '../utils/logger.js';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'JudgeAI <noreply@judgeai.app>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      logger.error('Email send error:', error);
      return false;
    }

    logger.info(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Email service error:', error);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  firstName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #1a1f2e; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #d4af37; font-size: 28px; font-weight: 600;">JudgeAI</h1>
                  <p style="margin: 10px 0 0 0; color: #a0a0a0; font-size: 14px;">Legal Intelligence Platform</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1a1f2e; font-size: 24px;">Verify Your Email</h2>
                  <p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    Hello ${firstName},
                  </p>
                  <p style="margin: 0 0 30px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    Thank you for registering with JudgeAI. Please use the verification code below to complete your registration:
                  </p>
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1f2e;">${code}</span>
                  </div>
                  <p style="margin: 0 0 20px 0; color: #888; font-size: 14px; line-height: 1.6;">
                    This code will expire in <strong>10 minutes</strong>.
                  </p>
                  <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.6;">
                    If you didn't request this verification, please ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; color: #888; font-size: 12px;">
                    © ${new Date().getFullYear()} JudgeAI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - JudgeAI',
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  code: string,
  firstName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #1a1f2e; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #d4af37; font-size: 28px; font-weight: 600;">JudgeAI</h1>
                  <p style="margin: 10px 0 0 0; color: #a0a0a0; font-size: 14px;">Legal Intelligence Platform</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1a1f2e; font-size: 24px;">Reset Your Password</h2>
                  <p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    Hello ${firstName},
                  </p>
                  <p style="margin: 0 0 30px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Use the code below to proceed:
                  </p>
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1f2e;">${code}</span>
                  </div>
                  <p style="margin: 0 0 20px 0; color: #888; font-size: 14px; line-height: 1.6;">
                    This code will expire in <strong>10 minutes</strong>.
                  </p>
                  <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.6;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; color: #888; font-size: 12px;">
                    © ${new Date().getFullYear()} JudgeAI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - JudgeAI',
    html,
  });
}

export async function sendApprovalEmail(
  email: string,
  firstName: string
): Promise<boolean> {
  const loginUrl = `${CLIENT_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Approved</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #1a1f2e; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #d4af37; font-size: 28px; font-weight: 600;">JudgeAI</h1>
                  <p style="margin: 10px 0 0 0; color: #a0a0a0; font-size: 14px;">Legal Intelligence Platform</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1a1f2e; font-size: 24px;">🎉 Account Approved!</h2>
                  <p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    Hello ${firstName},
                  </p>
                  <p style="margin: 0 0 30px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    Great news! Your JudgeAI account has been approved. You can now access all features of the platform.
                  </p>
                  <div style="text-align: center; margin: 0 0 30px 0;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 14px 40px; background-color: #2952e3; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Login to JudgeAI</a>
                  </div>
                  <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.6;">
                    Welcome to the JudgeAI community. We're excited to have you on board!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; color: #888; font-size: 12px;">
                    © ${new Date().getFullYear()} JudgeAI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Account Has Been Approved - JudgeAI',
    html,
  });
}

export async function sendRejectionEmail(
  email: string,
  firstName: string,
  reason?: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Status Update</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #1a1f2e; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #d4af37; font-size: 28px; font-weight: 600;">JudgeAI</h1>
                  <p style="margin: 10px 0 0 0; color: #a0a0a0; font-size: 14px;">Legal Intelligence Platform</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #1a1f2e; font-size: 24px;">Account Application Update</h2>
                  <p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    Hello ${firstName},
                  </p>
                  <p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.6;">
                    We regret to inform you that your application to join JudgeAI has not been approved at this time.
                  </p>
                  ${reason ? `<p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.6;"><strong>Reason:</strong> ${reason}</p>` : ''}
                  <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.6;">
                    If you believe this was an error or would like to provide additional information, please contact our support team.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; color: #888; font-size: 12px;">
                    © ${new Date().getFullYear()} JudgeAI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Account Application Update - JudgeAI',
    html,
  });
}
