// =============================================================================
// TuniEdu Notification Adapter Tests (email + SMS dispatch + provider registry)
// Run: npx tsx tests/integration/notification-tests.ts
//
// Purely local: no network required (the HTTP provider is only exercised via a
// captured fetch stub).
// =============================================================================

import {
  getNotificationProviderName,
  isNotificationsConfigured,
  registerNotificationProvider,
  sendEmail,
  sendSms,
  logNotificationProvider,
  smtpNotificationProvider,
  type NotificationProvider,
} from '../../apps/web/lib/notifications';
import { dispatchEmail, dispatchSms } from '../../apps/web/lib/notification-dispatch';
import { isQueueConfigured } from '../../apps/web/lib/queue';
import { parseSmtpUrl, sendSmtpMail } from '../../apps/web/lib/smtp';
import * as net from 'node:net';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

async function run(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const push = (id: string, name: string, passed: boolean, details: string) =>
    results.push({ id, name, passed, details });

  push(
    'NOTIF-01',
    'Default provider reports email delivery',
    getNotificationProviderName() === 'log',
    `provider=${getNotificationProviderName()}`,
  );

  const email = await sendEmail({ to: 'eleve@tuniedu.tn', subject: 'Test', text: 'Corps' });
  push('NOTIF-02', 'sendEmail dispatches via provider', email.delivered && email.channel === 'email', JSON.stringify(email));

  const sms = await sendSms({ to: '+21620000000', text: 'Code de vérification' });
  push('NOTIF-03', 'sendSms dispatches via provider', sms.delivered && sms.channel === 'sms', JSON.stringify(sms));

  const bad = await sendEmail({ to: '', subject: '', text: '' });
  push('NOTIF-04', 'Invalid message rejected (no recipient/subject)', !bad.delivered && !!bad.error, JSON.stringify(bad));

  // Provider registry: a custom provider must take over dispatch.
  const captured: string[] = [];
  const fake: NotificationProvider = {
    name: 'fake',
    async sendEmail(m) {
      captured.push(`email:${m.to}`);
      return { delivered: true, channel: 'email', provider: 'fake', messageId: 'x1' };
    },
    async sendSms(m) {
      captured.push(`sms:${m.to}`);
      return { delivered: true, channel: 'sms', provider: 'fake', messageId: 'x2' };
    },
  };
  registerNotificationProvider(fake);
  const viaFake = await sendEmail({ to: 'a@b.tn', subject: 'S', text: 'T' });
  const viaFakeSms = await sendSms({ to: '+21620000000', text: 'T' });
  push(
    'NOTIF-05',
    'Registered provider takes over dispatch (email + sms)',
    viaFake.provider === 'fake' && viaFakeSms.provider === 'fake' && captured.length === 2,
    `captured=${captured.join(',')} provider=${getNotificationProviderName()}`,
  );

  registerNotificationProvider(logNotificationProvider);
  push(
    'NOTIF-06',
    'isNotificationsConfigured reflects env driver',
    isNotificationsConfigured() === false,
    `driver/http configured=${isNotificationsConfigured()}`,
  );

  // Dispatch falls back to inline delivery when no queue is configured.
  const savedRedis = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const dispatched = await dispatchEmail({ to: 'eleve@tuniedu.tn', subject: 'Direct', text: 'En ligne' });
  const dispatchedSms = await dispatchSms({ to: '+21620000000', text: 'En ligne' });
  if (savedRedis !== undefined) process.env.REDIS_URL = savedRedis;
  push(
    'NOTIF-07',
    'dispatch falls back to inline delivery without a queue',
    isQueueConfigured() === false &&
      dispatched.queued === false &&
      dispatched.delivered === true &&
      dispatchedSms.queued === false &&
      dispatchedSms.delivered === true,
    `queue=${isQueueConfigured()} email={queued:${dispatched.queued},delivered:${dispatched.delivered}} sms={queued:${dispatchedSms.queued},delivered:${dispatchedSms.delivered}}`,
  );

  // SMTP provider soft-fails when SMTP_URL is absent (never throws).
  const savedSmtp = process.env.SMTP_URL;
  delete process.env.SMTP_URL;
  const smtp = await smtpNotificationProvider.sendEmail({ to: 'a@b.tn', subject: 'S', text: 'T' });
  const smtpSms = await smtpNotificationProvider.sendSms({ to: '+21620000000', text: 'T' });
  if (savedSmtp !== undefined) process.env.SMTP_URL = savedSmtp;
  push(
    'NOTIF-08',
    'SMTP provider soft-fails without SMTP_URL (email + sms)',
    smtp.delivered === false && !!smtp.error && smtpSms.delivered === false && !!smtpSms.error,
    `email=${smtp.error} sms=${smtpSms.error}`,
  );

  // NOTIF-09: SMTP URL parsing (scheme => default port, credentials decoded).
  const parsed = parseSmtpUrl('smtps://user%40tn:p%40ss@mail.tuniedu.tn');
  push(
    'NOTIF-09',
    'parseSmtpUrl resolves secure port + decoded credentials',
    parsed.host === 'mail.tuniedu.tn' &&
      parsed.port === 465 &&
      parsed.secure === true &&
      parsed.user === 'user@tn' &&
      parsed.pass === 'p@ss',
    `host=${parsed.host} port=${parsed.port} secure=${parsed.secure} user=${parsed.user}`,
  );

  // NOTIF-10: real SMTP handshake + AUTH + message delivery against a fake server.
  const fakeSmtp = await startFakeSmtp();
  try {
    const res = await sendSmtpMail(`smtp://user:pass@127.0.0.1:${fakeSmtp.port}`, {
      from: 'no-reply@tuniedu.tn',
      to: 'eleve@tuniedu.tn',
      subject: 'Réinitialisation du mot de passe',
      text: 'Bonjour, voici ton lien.',
      html: '<p>Bonjour, voici ton lien.</p>',
    });
    const body = fakeSmtp.received[0] || '';
    push(
      'NOTIF-10',
      'SMTP client sends authenticated message end-to-end',
      !!res.messageId &&
        fakeSmtp.authenticated &&
        body.includes('Subject:') &&
        body.includes('Bonjour, voici ton lien.') &&
        body.includes('Content-Type: multipart/alternative'),
      `messageId=${res.messageId} auth=${fakeSmtp.authenticated} subjectEncoded=${/=?UTF-8\?B\?/.test(body)} bodyLen=${body.length}`,
    );
  } finally {
    await fakeSmtp.close();
  }

  return results;
}

interface FakeSmtp {
  port: number;
  received: string[];
  authenticated: boolean;
  close: () => Promise<void>;
}

/** Minimal in-process SMTP server (no TLS) used to verify the SMTP client. */
function startFakeSmtp(): Promise<FakeSmtp> {
  return new Promise((resolve) => {
    const state: FakeSmtp = { port: 0, received: [], authenticated: false, close: async () => {} };
    const server = net.createServer((socket) => {
      let inData = false;
      let dataBuf = '';
      let lineBuf = '';
      let authStep = -1;
      socket.write('220 fake ESMTP TuniEdu\r\n');
      socket.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        if (inData) {
          dataBuf += text;
          const end = dataBuf.indexOf('\r\n.\r\n');
          if (end !== -1) {
            state.received.push(dataBuf.slice(0, end));
            dataBuf = '';
            inData = false;
            socket.write('250 OK queued\r\n');
          }
          return;
        }
        lineBuf += text;
        let idx = lineBuf.indexOf('\r\n');
        while (idx !== -1) {
          const line = lineBuf.slice(0, idx);
          lineBuf = lineBuf.slice(idx + 2);
          const upper = line.toUpperCase();
          if (upper.startsWith('EHLO')) {
            socket.write('250-fake\r\n250 AUTH LOGIN PLAIN\r\n');
          } else if (upper.startsWith('AUTH LOGIN')) {
            authStep = 0;
            socket.write('334 VXNlcm5hbWU6\r\n');
          } else if (authStep === 0) {
            authStep = 1;
            socket.write('334 UGFzc3dvcmQ6\r\n');
          } else if (authStep === 1) {
            authStep = -1;
            state.authenticated = true;
            socket.write('235 Authenticated\r\n');
          } else if (upper.startsWith('MAIL FROM')) {
            socket.write('250 OK\r\n');
          } else if (upper.startsWith('RCPT TO')) {
            socket.write('250 OK\r\n');
          } else if (upper.startsWith('DATA')) {
            inData = true;
            dataBuf = '';
            socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
          } else if (upper.startsWith('QUIT')) {
            socket.write('221 Bye\r\n');
            socket.end();
          } else {
            socket.write('250 OK\r\n');
          }
          idx = lineBuf.indexOf('\r\n');
        }
      });
      socket.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      state.port = typeof address === 'object' && address ? address.port : 0;
      state.close = () => new Promise<void>((res) => server.close(() => res()));
      resolve(state);
    });
  });
}

if (require.main === module) {
  (async () => {
    try {
      const results = await run();
      console.log('===========================================================');
      console.log('  TUNIEDU NOTIFICATION ADAPTER TESTS');
      console.log('===========================================================');
      let allPassed = true;
      for (const r of results) {
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
        console.log(`        -> ${r.details}`);
        if (!r.passed) allPassed = false;
      }
      console.log('-----------------------------------------------------------');
      console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
      if (!allPassed) { console.error('NOTIFICATION TESTS FAILED'); process.exit(1); }
      console.log('ALL NOTIFICATION TESTS PASSED');
    } catch (err) {
      console.error('NOTIFICATION TEST SUITE ERROR:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  })();
}
