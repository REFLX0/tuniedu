// =============================================================================
// Focused regression tests: webhook signature verification (SEC-07 / SEC-21)
// Run: npx tsx tests/security/webhook-tests.ts
// Covers: valid signature, invalid signature, modified payload, both former
// bypass patterns, missing signature, empty secret, malformed input.
// =============================================================================

import {
  verifyWebhookSignature,
  computeWebhookSignature,
} from '../../packages/payments';

interface WebhookTestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

export function runWebhookSignatureTests(): WebhookTestResult[] {
  const results: WebhookTestResult[] = [];

  const body = JSON.stringify({ event: 'payment.succeeded', amountMillimes: 25000 });
  const secret = 'focused_test_secret_only';

  // 1. Valid cryptographic signature (hex) is accepted
  const validHex = computeWebhookSignature(body, secret);
  results.push({
    id: 'WH-01',
    name: 'Valid HMAC-SHA256 hex signature is accepted',
    passed: verifyWebhookSignature(body, validHex, secret) === true,
    details: `Signature length ${validHex.length}, computed from test-only secret`,
  });

  // 2. Valid cryptographic signature (base64) is accepted
  const validBase64 = require('crypto')
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
  results.push({
    id: 'WH-02',
    name: 'Valid HMAC-SHA256 base64 signature is accepted',
    passed: verifyWebhookSignature(body, validBase64, secret) === true,
    details: 'Base64-encoded HMAC accepted as provider-format alternative',
  });

  // 3. Invalid signature is rejected
  results.push({
    id: 'WH-03',
    name: 'Invalid signature is rejected',
    passed: verifyWebhookSignature(body, 'not_a_real_signature', secret) === false,
    details: 'Random signature string rejected',
  });

  // 4. Modified request body is rejected
  const modifiedBody = JSON.stringify({
    event: 'payment.succeeded',
    amountMillimes: 1, // attacker-tampered amount
  });
  results.push({
    id: 'WH-04',
    name: 'Signature over original body fails for modified body',
    passed: verifyWebhookSignature(modifiedBody, validHex, secret) === false,
    details: 'Same signature, different payload rejected',
  });

  // 5. Former sig_valid_ bypass pattern is NOT accepted by prefix alone
  results.push({
    id: 'WH-05',
    name: "sig_valid_ prefix does not authenticate",
    passed: verifyWebhookSignature(body, 'sig_valid_regression_check', secret) === false,
    details: 'Former sandbox shortcut rejected in production verifier',
  });

  // 6. Former hash_${secret.slice(0,8)} bypass pattern is NOT accepted
  const formerHashShortcut = `hash_${secret.slice(0, 8)}`;
  results.push({
    id: 'WH-06',
    name: 'hash_ shortcut of secret prefix does not authenticate',
    passed: verifyWebhookSignature(body, formerHashShortcut, secret) === false,
    details: 'Former sandbox shortcut rejected in production verifier',
  });

  // 7. Missing signature is rejected
  results.push({
    id: 'WH-07',
    name: 'Missing signature is rejected',
    passed: verifyWebhookSignature(body, '', secret) === false,
    details: 'Empty signature rejected by guard clause',
  });

  // 8. Empty secret is rejected
  results.push({
    id: 'WH-08',
    name: 'Empty secret is rejected',
    passed: verifyWebhookSignature(body, validHex, '') === false,
    details: 'Empty secret rejected by guard clause',
  });

  // 9. Malformed raw body (non-string) fails safely
  results.push({
    id: 'WH-09',
    name: 'Malformed raw body (non-string) fails safely',
    passed:
      verifyWebhookSignature(undefined as unknown as string, validHex, secret) === false &&
      verifyWebhookSignature(null as unknown as string, validHex, secret) === false,
    details: 'Non-string rawBody rejected without throwing',
  });

  // 10. Signature computed with a different secret is rejected
  const wrongSecretSig = computeWebhookSignature(body, 'different_secret');
  results.push({
    id: 'WH-10',
    name: 'Signature computed with wrong secret is rejected',
    passed: verifyWebhookSignature(body, wrongSecretSig, secret) === false,
    details: 'Cross-secret signature rejected',
  });

  return results;
}

// Standalone execution
if (require.main === module) {
  const results = runWebhookSignatureTests();
  console.log('===========================================================');
  console.log('  TUNIEDU WEBHOOK SIGNATURE FOCUSED REGRESSION TESTS');
  console.log('===========================================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
    console.log(`        -> ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('-----------------------------------------------------------');
  const passed = results.filter((r) => r.passed).length;
  console.log(`${passed}/${results.length} passed`);
  if (!allPassed) {
    console.error('WEBHOOK REGRESSION TESTS FAILED');
    process.exit(1);
  }
  console.log('ALL WEBHOOK REGRESSION TESTS PASSED');
}
