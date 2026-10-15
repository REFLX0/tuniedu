import { runSecurityAcceptanceTests } from './sec-tests';

console.log('===========================================================');
console.log('   TUNIEDU SECURITY ACCEPTANCE TEST RUNNER (SEC-01 - SEC-26)');
console.log('===========================================================\n');

const results = runSecurityAcceptanceTests();

let allPassed = true;

for (const res of results) {
  const statusIcon = res.passed ? '✓ PASSED' : '✗ FAILED';
  console.log(`[${statusIcon}] ${res.id}: ${res.name}`);
  console.log(`         -> ${res.details}`);
  if (!res.passed) allPassed = false;
}

console.log('\n-----------------------------------------------------------');
if (allPassed) {
  console.log(`✓ ALL ${results.length} SECURITY ACCEPTANCE TESTS PASSED SUCCESSFULLY.`);
} else {
  console.error(`✗ ONE OR MORE SECURITY ACCEPTANCE TESTS FAILED.`);
  process.exit(1);
}
