// =============================================================================
// TuniEdu Notification Adapter (email + SMS)
// Provider-agnostic dispatch with a console/log default so local dev never
// crashes on missing credentials. A generic HTTP provider (signed webhook) can
// be enabled via env, and any provider can be injected at runtime.
//
// Configuration (see .env.example):
//   NOTIFICATIONS_DRIVER        'log' (default) | 'http' | 'smtp'
//   NOTIFICATIONS_FROM_EMAIL    sender address
//   NOTIFICATIONS_FROM_SMS      sender id / number
//   NOTIFICATIONS_WEBHOOK_URL   base URL of the HTTP delivery gateway
//   NOTIFICATIONS_WEBHOOK_TOKEN bearer token for the gateway
//   SMTP_URL                    smtp(s)://user:pass@host:port connection string
// =============================================================================

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SmsMessage {
  to: string;
  text: string;
}

export interface NotificationResult {
  delivered: boolean;
  channel: 'email' | 'sms';
  provider: string;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<NotificationResult>;
  sendSms(message: SmsMessage): Promise<NotificationResult>;
}

const DRIVER = (process.env.NOTIFICATIONS_DRIVER || 'log').toLowerCase();
const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL || 'no-reply@tuniedu.tn';
const FROM_SMS = process.env.NOTIFICATIONS_FROM_SMS || 'TUNIEDU';
const WEBHOOK_URL = process.env.NOTIFICATIONS_WEBHOOK_URL || '';
const WEBHOOK_TOKEN = process.env.NOTIFICATIONS_WEBHOOK_TOKEN || '';
const SMTP_URL = process.env.SMTP_URL || '';

/** Dev/default provider: logs the message and reports success. */
export const logNotificationProvider: NotificationProvider = {
  name: 'log',
  async sendEmail(message) {
    console.log(`[notifications:email] from=${FROM_EMAIL} to=${message.to} subject="${message.subject}"`);
    console.log(`[notifications:email] body: ${message.text}`);
    return { delivered: true, channel: 'email', provider: 'log', messageId: `log_${Date.now()}` };
  },
  async sendSms(message) {
    console.log(`[notifications:sms] from=${FROM_SMS} to=${message.to} body: ${message.text}`);
    return { delivered: true, channel: 'sms', provider: 'log', messageId: `log_${Date.now()}` };
  },
};

/** HTTP gateway provider: POSTs JSON to `${WEBHOOK_URL}/email` and `/sms`. */
export const httpNotificationProvider: NotificationProvider = {
  name: 'http',
  async sendEmail(message) {
    return postToGateway('email', { from: FROM_EMAIL, ...message });
  },
  async sendSms(message) {
    return postToGateway('sms', { from: FROM_SMS, to: message.to, text: message.text });
  },
};

async function postToGateway(
  channel: 'email' | 'sms',
  payload: Record<string, unknown>,
): Promise<NotificationResult> {
  try {
    const res = await fetch(`${WEBHOOK_URL}/${channel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_TOKEN ? { Authorization: `Bearer ${WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { delivered: false, channel, provider: 'http', error: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { delivered: true, channel, provider: 'http', messageId: data.id };
  } catch (err) {
    return {
      delivered: false,
      channel,
      provider: 'http',
      error: err instanceof Error ? err.message : 'delivery failed',
    };
  }
}

export function isNotificationsConfigured(): boolean {
  if (DRIVER === 'smtp') return Boolean(SMTP_URL);
  if (DRIVER === 'http') return Boolean(WEBHOOK_URL);
  return false;
}

/**
 * SMTP provider: real email delivery via the dependency-free SMTP client
 * (apps/web/lib/smtp.ts). SMS is not served over SMTP and reports a soft
 * failure so callers can fall back to a gateway.
 */
export const smtpNotificationProvider: NotificationProvider = {
  name: 'smtp',
  async sendEmail(message) {
    if (!SMTP_URL) {
      return { delivered: false, channel: 'email', provider: 'smtp', error: 'SMTP_URL not configured' };
    }
    try {
      const { sendSmtpMail } = await import('./smtp');
      const info = await sendSmtpMail(SMTP_URL, {
        from: FROM_EMAIL,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { delivered: true, channel: 'email', provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      return {
        delivered: false,
        channel: 'email',
        provider: 'smtp',
        error: err instanceof Error ? err.message : 'smtp delivery failed',
      };
    }
  },
  async sendSms(message) {
    void message;
    return {
      delivered: false,
      channel: 'sms',
      provider: 'smtp',
      error: 'SMS non pris en charge par le transport SMTP',
    };
  },
};

let activeProvider: NotificationProvider =
  DRIVER === 'smtp' && SMTP_URL
    ? smtpNotificationProvider
    : isNotificationsConfigured()
      ? httpNotificationProvider
      : logNotificationProvider;

export function registerNotificationProvider(provider: NotificationProvider): void {
  activeProvider = provider;
}

export function getNotificationProvider(): NotificationProvider {
  return activeProvider;
}

export function getNotificationProviderName(): string {
  return activeProvider.name;
}

export async function sendEmail(message: EmailMessage): Promise<NotificationResult> {
  if (!message.to || !message.subject) {
    return { delivered: false, channel: 'email', provider: activeProvider.name, error: 'missing recipient/subject' };
  }
  return activeProvider.sendEmail(message);
}

export async function sendSms(message: SmsMessage): Promise<NotificationResult> {
  if (!message.to || !message.text) {
    return { delivered: false, channel: 'sms', provider: activeProvider.name, error: 'missing recipient/body' };
  }
  return activeProvider.sendSms(message);
}
