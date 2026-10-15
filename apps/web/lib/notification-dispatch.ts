// =============================================================================
// TuniEdu Notification Dispatch
// Queue-backed delivery: when Redis is configured, notifications are enqueued so
// the worker process delivers them with retries/backoff (decoupling the API
// request from the SMTP/gateway round-trip). Falls back to inline delivery when
// no queue is available. Never throws — always returns a result object.
// =============================================================================

import { enqueueNotification, isQueueConfigured } from './queue';
import {
  sendEmail,
  sendSms,
  type EmailMessage,
  type SmsMessage,
} from './notifications';

export interface DispatchResult {
  queued: boolean;
  delivered: boolean;
  jobId?: string;
  provider?: string;
  error?: string;
}

export async function dispatchEmail(message: EmailMessage): Promise<DispatchResult> {
  if (isQueueConfigured()) {
    const jobId = await enqueueNotification({
      channel: 'email',
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (jobId) return { queued: true, delivered: false, jobId };
  }
  const result = await sendEmail(message);
  return { queued: false, delivered: result.delivered, provider: result.provider, error: result.error };
}

export async function dispatchSms(message: SmsMessage): Promise<DispatchResult> {
  if (isQueueConfigured()) {
    const jobId = await enqueueNotification({ channel: 'sms', to: message.to, text: message.text });
    if (jobId) return { queued: true, delivered: false, jobId };
  }
  const result = await sendSms(message);
  return { queued: false, delivered: result.delivered, provider: result.provider, error: result.error };
}
