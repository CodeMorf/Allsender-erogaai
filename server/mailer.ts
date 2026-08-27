import nodemailer from 'nodemailer';
import { EmailSettings } from '../src/types.ts';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SendEmailOptions {
  settings?: EmailSettings | null;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

/**
 * Creates Nodemailer Transporter dynamically from Org Settings or Server Environment
 */
function createTransporter(settings?: EmailSettings | null) {
  const host = settings?.smtp_host || process.env.SMTP_HOST;
  const port = Number(settings?.smtp_port || process.env.SMTP_PORT || 587);
  const secure = settings?.smtp_secure ?? (process.env.SMTP_SECURE === 'true');
  const user = settings?.smtp_user || process.env.SMTP_USER;
  const pass = settings?.encrypted_pass || process.env.SMTP_PASSWORD;

  if (!host || !user) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

/**
 * Tests SMTP credentials connection
 */
export async function testSMTPConnection(settings?: EmailSettings | null): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter(settings);
    if (!transporter) {
      return {
        success: false,
        message: 'SMTP_NOT_CONFIGURED: Debe especificar Servidor SMTP (Host), Usuario y Contraseña.'
      };
    }
    await transporter.verify();
    return {
      success: true,
      message: 'Conexión SMTP verificada exitosamente. Servidor listo para enviar reportes por correo.'
    };
  } catch (error: any) {
    console.error('SMTP Test Error:', error);
    return {
      success: false,
      message: `Fallo al conectar con el servidor SMTP: ${error.message || 'Credenciales o puerto rechazado'}`
    };
  }
}

/**
 * Sends Emails with Optional Attachments (PDF / XLSX)
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter(options.settings);
    if (!transporter) {
      return {
        success: false,
        error: 'SMTP_NOT_CONFIGURED: No se ha configurado un servidor SMTP válido para este inquilino.'
      };
    }

    const fromName = options.settings?.smtp_from_name || process.env.SMTP_FROM_NAME || 'ErogaAI SaaS Platform';
    const fromEmail = options.settings?.smtp_from || process.env.SMTP_FROM || 'no-reply@erogaai.com';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error: any) {
    console.error('Email Send Error:', error);
    return {
      success: false,
      error: error.message || 'Error al enviar mensaje vía SMTP'
    };
  }
}
