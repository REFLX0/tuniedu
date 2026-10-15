// =============================================================================
// Focused regression tests: fail-closed API session enforcement (SEC-01)
// Run: npx tsx tests/security/auth-session-tests.ts
// Proves: unauthenticated requests cannot inherit the simulated store identity;
// the dev x-user-id fallback is inert under NODE_ENV=production.
// =============================================================================

import { NextRequest } from 'next/server';
import { getSessionUser, requireApiSession } from '../../apps/web/lib/auth';

interface AuthTestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

function req(headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/videos', headers ? { headers } : undefined);
}

export async function runAllAuthSessionTests(): Promise<AuthTestResult[]> {
  const collected: AuthTestResult[] = [];
  const ORIG = process.env.NODE_ENV;

  // AS-01: no credentials at all -> getSessionUser null
  {
    const u = await getSessionUser(req());
    collected.push({
      id: 'AS-01',
      name: 'getSessionUser returns null with no cookie/bearer/header',
      passed: u === null,
      details: `returned ${u === null ? 'null' : JSON.stringify(u)}`,
    });
  }

  // AS-02: requireApiSession returns 401 (fail closed) with no credentials
  {
    const r = await requireApiSession(req());
    collected.push({
      id: 'AS-02',
      name: 'requireApiSession returns a 401 errorResponse when unauthenticated',
      passed: r.user === null && r.errorResponse !== null && r.errorResponse.status === 401,
      details: `errorResponse status ${r.errorResponse ? r.errorResponse.status : 'none'}`,
    });
  }

  // AS-03: dev x-user-id fallback active ONLY when NODE_ENV !== 'production'
  process.env.NODE_ENV = 'development';
  {
    const u = await getSessionUser(req({ 'x-user-id': 'user_student_1' }));
    collected.push({
      id: 'AS-03',
      name: 'Dev x-user-id fallback resolves in non-production',
      passed: u !== null && u.id === 'user_student_1',
      details: `resolved ${u ? u.id : 'null'}`,
    });
  }

  // AS-04: same header must NOT authenticate under NODE_ENV=production
  process.env.NODE_ENV = 'production';
  {
    const u = await getSessionUser(req({ 'x-user-id': 'user_student_1' }));
    collected.push({
      id: 'AS-04',
      name: 'x-user-id fallback is inert under NODE_ENV=production',
      passed: u === null,
      details: `returned ${u === null ? 'null (correct)' : 'LEAK: ' + u.id}`,
    });
  }

  // AS-05: requireApiSession 401 under production despite the dev header
  {
    const r = await requireApiSession(req({ 'x-user-id': 'user_student_1' }));
    collected.push({
      id: 'AS-05',
      name: 'requireApiSession 401 in production despite x-user-id header',
      passed: r.user === null && r.errorResponse !== null && r.errorResponse.status === 401,
      details: `errorResponse status ${r.errorResponse ? r.errorResponse.status : 'none'}`,
    });
  }

  process.env.NODE_ENV = ORIG;
  return collected;
}

if (require.main === module) {
  (async () => {
    const results = await runAllAuthSessionTests();
    console.log('===========================================================');
    console.log('  TUNIEDU FAIL-CLOSED SESSION REGRESSION TESTS');
    console.log('===========================================================');
    let allPassed = true;
    for (const r of results) {
      console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
      console.log(`        -> ${r.details}`);
      if (!r.passed) allPassed = false;
    }
    console.log('-----------------------------------------------------------');
    console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
    if (!allPassed) {
      console.error('AUTH SESSION REGRESSION TESTS FAILED');
      process.exit(1);
    }
    console.log('ALL AUTH SESSION REGRESSION TESTS PASSED');
  })();
}
