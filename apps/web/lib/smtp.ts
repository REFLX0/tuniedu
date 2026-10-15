// =============================================================================
// TuniEdu Minimal SMTP Client (dependency-free)
// A small, focused transactional-email sender built on Node's `net`/`tls`.
// Supports smtp:// (with STARTTLS) and smtps:// (implicit TLS), AUTH LOGIN /
// PLAIN, and plain-text or multipart/alternative (text + HTML) bodies.
//
// Chosen over nodemailer because the published nodemailer <=9.0.0 carries an
// unresolved high-severity advisory (GHSA-p6gq-j5cr-w38f); our fixed message
// template never uses the raw/attachment options that advisory concerns.
//
// This module only builds and transmits a fixed-safe message shape: callers
// cannot inject raw MIME headers or attachments.
// =============================================================================

import * as net from 'node:net';
import * as tls from 'node:tls';
import { randomUUID } from 'node:crypto';

export interface SmtpMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // implicit TLS (smtps)
  user?: string;
  pass?: string;
}

export function parseSmtpUrl(url: string): SmtpConfig {
  const u = new URL(url);
  const secure = u.protocol === 'smtps:';
  const port = u.port ? Number(u.port) : secure ? 465 : 587;
  return {
    host: u.hostname,
    port,
    secure,
    user: u.username ? decodeURIComponent(u.username) : undefined,
    pass: u.password ? decodeURIComponent(u.password) : undefined,
  };
}

interface SmtpResponse {
  code: number;
  text: string;
}

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  private pending: { resolve: (r: SmtpResponse) => void; reject: (e: Error) => void } | null = null;

  constructor(socket: net.Socket | tls.TLSSocket, private readonly timeoutMs: number) {
    this.socket = socket;
    this.attach(socket);
  }

  private attach(socket: net.Socket | tls.TLSSocket): void {
    socket.setTimeout(this.timeoutMs);
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.tryResolve();
    });
    socket.on('timeout', () => {
      socket.destroy(new Error('SMTP socket timeout'));
    });
    socket.on('error', (err: Error) => {
      if (this.pending) {
        const { reject } = this.pending;
        this.pending = null;
        reject(err);
      }
    });
    socket.on('close', () => {
      if (this.pending) {
        const { reject } = this.pending;
        this.pending = null;
        reject(new Error('SMTP connection closed'));
      }
    });
  }

  private tryResolve(): void {
    if (!this.pending) return;
    // Final line of an SMTP response: 3 digits followed by a space.
    const match = this.buffer.match(/^(\d{3}) [^\n]*\r\n/m);
    if (!match) return;
    const endIdx = (match.index ?? 0) + match[0].length;
    const response = this.buffer.slice(0, endIdx);
    this.buffer = this.buffer.slice(endIdx);
    const { resolve } = this.pending;
    this.pending = null;
    resolve({ code: Number(match[1]), text: response });
  }

  readResponse(): Promise<SmtpResponse> {
    return new Promise<SmtpResponse>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.tryResolve();
    });
  }

  async command(cmd: string): Promise<SmtpResponse> {
    this.socket.write(`${cmd}\r\n`);
    return this.readResponse();
  }

  async sendData(payload: string): Promise<SmtpResponse> {
    this.socket.write(payload);
    return this.readResponse();
  }

  async upgradeToTls(host: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const tlsSocket = tls.connect({ socket: this.socket as net.Socket, servername: host }, () => resolve());
      tlsSocket.once('error', reject);
      this.socket = tlsSocket;
      this.buffer = '';
      this.attach(tlsSocket);
    });
  }

  close(): void {
    try {
      this.socket.end();
    } catch {
      // ignore
    }
  }
}

function encodeHeader(value: string): string {
  // RFC 2047 encoded-word for non-ASCII headers (e.g. French accents).
  return /[^\x20-\x7E]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=` : value;
}

function buildMessage(message: SmtpMessage): string {
  const messageId = `<${randomUUID()}@tuniedu.tn>`;
  const headers: string[] = [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
  ];

  let body: string;
  if (message.html) {
    const boundary = `tuniedu_${randomUUID().replace(/-/g, '')}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      message.text,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      message.html,
      `--${boundary}--`,
      '',
    ].join('\r\n');
  } else {
    headers.push('Content-Type: text/plain; charset=utf-8');
    headers.push('Content-Transfer-Encoding: 8bit');
    body = `${message.text}\r\n`;
  }

  const raw = `${headers.join('\r\n')}\r\n\r\n${body}`;
  // Dot-stuffing: a line consisting of/starts with '.' must be doubled.
  const stuffed = raw
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
  return `${stuffed}\r\n.\r\n`;
}

async function authenticate(session: SmtpSession, config: SmtpConfig): Promise<SmtpResponse> {
  const user = config.user as string;
  const pass = config.pass as string;
  // Prefer AUTH LOGIN; fall back to AUTH PLAIN when the server rejects it.
  const login = await session.command('AUTH LOGIN');
  if (login.code === 334) {
    await session.command(Buffer.from(user, 'utf8').toString('base64'));
    const passStep = await session.command(Buffer.from(pass, 'utf8').toString('base64'));
    return passStep;
  }
  const plain = `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`, 'utf8').toString('base64')}`;
  return session.command(plain);
}

/**
 * Sends a single transactional email over SMTP. Throws on failure so the caller
 * decides how to degrade. The message shape is fixed (from/to/subject/text/html).
 */
export async function sendSmtpMail(
  url: string,
  message: SmtpMessage,
  opts?: { timeoutMs?: number },
): Promise<{ messageId: string }> {
  const config = parseSmtpUrl(url);
  const timeoutMs = opts?.timeoutMs ?? 15000;

  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });

  const session = new SmtpSession(socket, timeoutMs);
  const messageId = randomUUID();

  try {
    const greeting = await session.readResponse();
    if (greeting.code !== 220) throw new Error(`SMTP greeting ${greeting.code}`);

    const ehlo = await session.command(`EHLO ${config.host}`);
    if (ehlo.code !== 250) throw new Error(`SMTP EHLO ${ehlo.code}`);

    // Opportunistic STARTTLS for the plaintext protocol.
    if (!config.secure && /STARTTLS/i.test(ehlo.text)) {
      const starttls = await session.command('STARTTLS');
      if (starttls.code !== 220) throw new Error(`SMTP STARTTLS ${starttls.code}`);
      await session.upgradeToTls(config.host);
      const ehlo2 = await session.command(`EHLO ${config.host}`);
      if (ehlo2.code !== 250) throw new Error(`SMTP EHLO(TLS) ${ehlo2.code}`);
    }

    if (config.user && config.pass) {
      const auth = await authenticate(session, config);
      if (auth.code !== 235 && auth.code !== 503) throw new Error(`SMTP AUTH ${auth.code}`);
    }

    const mailFrom = await session.command(`MAIL FROM:<${message.from}>`);
    if (mailFrom.code !== 250) throw new Error(`SMTP MAIL FROM ${mailFrom.code}`);

    const rcptTo = await session.command(`RCPT TO:<${message.to}>`);
    if (rcptTo.code !== 250 && rcptTo.code !== 251) throw new Error(`SMTP RCPT TO ${rcptTo.code}`);

    const data = await session.command('DATA');
    if (data.code !== 354) throw new Error(`SMTP DATA ${data.code}`);

    const sent = await session.sendData(buildMessage(message));
    if (sent.code !== 250) throw new Error(`SMTP message rejected ${sent.code}`);

    await session.command('QUIT');
    return { messageId };
  } finally {
    session.close();
  }
}
