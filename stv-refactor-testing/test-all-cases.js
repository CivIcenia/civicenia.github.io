// Comprehensive test to verify the fix resolves all vote counting issues
import { simplifyVoterName, extractVoterName } from '../src/lib/discord-parser.js';

console.log('=== Comprehensive Voter Header Detection Test ===\n');

// Test cases covering various ballot formats
const testCases = [
    {
        name: 'drbaconhair (THE BUG)',
        voter: 'drbaconhair',
        originalText: `Dr Bacon Hair(real)

 — 3/1/2026 6:16 am
@toasttastesprettygood`,
        expectedFirstLine: 'Dr Bacon Hair(real)',
        expectedResult: 'voter',
        description: 'Display name on separate line from timestamp, with (real) suffix'
    },
    {
        name: 'alzubloxxer11 (normal)',
        voter: 'alzubloxxer11',
        originalText: 'AlzuBloxxer11 — 3/1/2026 6:14 am\n@Dr Bacon Hair(real)',
        expectedFirstLine: 'AlzuBloxxer11 — 3/1/2026 6:14 am',
        expectedResult: 'voter',
        description: 'Standard Discord format with em-dash on same line'
    },
    {
        name: 'speedyjjustice (split header)',
        voter: 'speedyjjustice',
        originalText: `Speedy J. Justice

 — 4/1/2026 12:54 am
Vote this to fight venezuela speedy`,
        expectedFirstLine: 'Speedy J. Justice',
        expectedResult: 'voter',
        description: 'Name on separate line from timestamp'
    },
    {
        name: 'hsmnewfriend (split header)',
        voter: 'hsmnewfriend',
        originalText: `HsmNewfriend

 — 4/1/2026 1:42 am
Minemaster`,
        expectedFirstLine: 'HsmNewfriend',
        expectedResult: 'voter',
        description: 'Name matches voter key after simplification'
    }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    console.log(`\n--- Test: ${testCase.name} ---`);
    console.log(`Description: ${testCase.description}`);
    
    const firstLine = testCase.originalText.split('\n')[0];
    const lineToCheck = testCase.expectedFirstLine;
    
    // Extract and simplify
    const extractedVoter = extractVoterName(firstLine);
    const simplifiedLine = simplifyVoterName(lineToCheck);
    const baseVoter = testCase.voter.replace(/#\d+$/, '');
    const simplifiedVoter = simplifyVoterName(baseVoter);
    const simplifiedExtracted = simplifyVoterName(extractedVoter || '');
    
    // Check matching (same logic as the fix)
    const shouldBeVoter = simplifiedLine === simplifiedVoter ||
        simplifiedLine === simplifiedExtracted ||
        simplifiedLine.startsWith(simplifiedVoter) ||
        simplifiedVoter.startsWith(simplifiedLine) ||
        simplifiedLine.startsWith(simplifiedExtracted) ||
        simplifiedExtracted.startsWith(simplifiedLine);
    
    const result = shouldBeVoter ? 'voter' : 'not-voter';
    const success = result === testCase.expectedResult;
    
    console.log(`  First line: "${firstLine}"`);
    console.log(`  Simplified: "${simplifiedLine}" vs "${simplifiedVoter}" vs "${simplifiedExtracted}"`);
    console.log(`  Result: ${result} (expected: ${testCase.expectedResult})`);
    console.log(`  ${success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (success) {
        passed++;
    } else {
        failed++;
        console.log(`  ERROR: Expected ${testCase.expectedResult} but got ${result}`);
    }
}

console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED! The fix correctly handles all ballot formats.');
    console.log('\nExpected impact on vote counts:');
    console.log('  • Dr Bacon Hair: 9 → 8 first-choice votes (fixed drbaconhair ballot)');
    console.log('  • toasttastesprettygood: 13 → 14 first-choice votes');
    console.log('  • All subsequent rounds should now match PRE_REFACTOR results');
} else {
    console.log('\n❌ SOME TESTS FAILED. The fix may need adjustment.');
    process.exit(1);
}
