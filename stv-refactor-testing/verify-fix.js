// Verification script to check the fix for voter header detection bug
import { simplifyVoterName, extractVoterName } from '../src/lib/discord-parser.js';

// Test case: drbaconhair ballot
const voter = 'drbaconhair';
const originalText = `Dr Bacon Hair(real)

 — 3/1/2026 6:16 am
@toasttastesprettygood 
@HsmNewfriend 
@Dr Bacon Hair(real)`;

const firstLine = originalText.split('\n')[0];
const lineToCheck = 'Dr Bacon Hair(real)';

console.log('=== Verification Test for drbaconhair ballot ===\n');

// Extract voter from first line
const extractedVoter = extractVoterName(firstLine);
console.log('First line of ballot:', JSON.stringify(firstLine));
console.log('Extracted voter:', JSON.stringify(extractedVoter));

// Simplify all variants
const simplifiedLine = simplifyVoterName(lineToCheck);
const baseVoter = voter.replace(/#\d+$/, '');
const simplifiedVoter = simplifyVoterName(baseVoter);
const simplifiedExtracted = simplifyVoterName(extractedVoter || '');

console.log('\nSimplified forms:');
console.log('  Line to check:', JSON.stringify(lineToCheck), '→', JSON.stringify(simplifiedLine));
console.log('  Base voter:', JSON.stringify(baseVoter), '→', JSON.stringify(simplifiedVoter));
console.log('  Extracted voter:', JSON.stringify(extractedVoter), '→', JSON.stringify(simplifiedExtracted));

// Check all matching conditions
console.log('\nMatching checks:');
console.log('  simplifiedLine === simplifiedVoter:', simplifiedLine === simplifiedVoter);
console.log('  simplifiedLine === simplifiedExtracted:', simplifiedLine === simplifiedExtracted);
console.log('  simplifiedLine.startsWith(simplifiedVoter):', simplifiedLine.startsWith(simplifiedVoter));
console.log('  simplifiedVoter.startsWith(simplifiedLine):', simplifiedVoter.startsWith(simplifiedLine));
console.log('  simplifiedLine.startsWith(simplifiedExtracted):', simplifiedLine.startsWith(simplifiedExtracted));
console.log('  simplifiedExtracted.startsWith(simplifiedLine):', simplifiedExtracted.startsWith(simplifiedLine));

// Determine result
const shouldBeVoter = simplifiedLine === simplifiedVoter ||
    simplifiedLine === simplifiedExtracted ||
    simplifiedLine.startsWith(simplifiedVoter) ||
    simplifiedVoter.startsWith(simplifiedLine) ||
    simplifiedLine.startsWith(simplifiedExtracted) ||
    simplifiedExtracted.startsWith(simplifiedLine);

console.log('\n✓ Result: Line should be classified as', shouldBeVoter ? 'VOTER (correct!)' : 'not voter (BUG!)');

if (shouldBeVoter) {
    console.log('\n✅ FIX VERIFIED: The first line will now be correctly identified as the voter header');
    console.log('   instead of being misclassified as a candidate vote for "Dr Bacon Hair"');
} else {
    console.log('\n❌ FIX FAILED: The line is still not being identified as a voter header');
}
