const fs = require('fs');
const data = JSON.parse(fs.readFileSync('stv-refactor-testing/stv-election-senate-election-january-2026-term-43.json', 'utf-8'));

function simplifyVoterName(name) {
    const rolePrefixes = [
        'ex-councilor', 'ex councilor',
        'councilor', 'council',
        'mayor', 'president',
        'ceo', 'speaker',
        'turbo janny',
        'senator', 'judge',
        'trial_len',
        'lord', 'sir',
    ];
    let simplified = name.trim();
    for (const prefix of rolePrefixes) {
        const regex = new RegExp('^' + prefix + '\\s+', 'i');
        simplified = simplified.replace(regex, '');
    }
    simplified = simplified
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
    return simplified || name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanCandidateName(name) {
    return name
        .replace(/@/g, '')
        .replace(/^\d+\.?\s*/, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/["']/g, '')
        .trim()
        .replace(/\s+/g, ' ');
}

function hasEmDash(text) {
    // Check for em-dash like characters AND a letter
    return /[\u2013\u2014\-–—]/.test(text) && /[A-Za-z]/.test(text);
}

const originalBallotText = data.originalBallotText || {};
const nameMatches = data.nameMatches || {};
const candidates = data.candidates || [];
const affected = [];

// Analyze ALL ballots for the bug
for (const [voterKey, ballotText] of Object.entries(originalBallotText)) {
    if (!ballotText) continue;
    const lines = ballotText.split('\n');
    const firstLine = lines[0]?.trim() || '';
    if (!firstLine) continue;
    
    const firstLineHasDash = hasEmDash(firstLine);
    const simplifiedFirstLine = simplifyVoterName(firstLine);
    const baseVoter = voterKey.replace(/#\d+$/, '');
    const simplifiedVoter = simplifyVoterName(baseVoter);
    const wouldMatchVoter = simplifiedFirstLine === simplifiedVoter;
    
    // If first line has dash, it would be classified as voter
    // If simplified names match, it would be classified as voter
    // Otherwise, check if it would be classified as a candidate
    if (!firstLineHasDash && !wouldMatchVoter) {
        const cleaned = cleanCandidateName(firstLine);
        if (cleaned) {
            const matchedCandidate = nameMatches[cleaned];
            if (matchedCandidate && matchedCandidate !== '__NOT_A_BALLOT__' && matchedCandidate !== null) {
                // Find if actual ballot rankings include this incorrectly
                const ballot = data.ballots.find(b => b.voter === voterKey);
                const actualRankings = ballot?.rankings || [];
                
                affected.push({
                    voterKey,
                    firstLine,
                    simplifiedFirstLine,
                    simplifiedVoter,
                    cleanedFirstLine: cleaned,
                    matchedCandidate,
                    actualRankings,
                    isCandidate: candidates.includes(matchedCandidate)
                });
            }
        }
    }
}

console.log('='.repeat(80));
console.log('ANALYSIS: Voter Display Names Incorrectly Classified as Candidate Votes');
console.log('='.repeat(80));
console.log();
console.log('The bug occurs when classifyOriginalLine() processes the first line of a ballot.');
console.log('If the first line (voter display name) does NOT:');
console.log('  1. Match simplifyVoterName(voter key)');
console.log('  2. Contain an em-dash character (—, –, -, etc.)');
console.log('Then it falls through to candidate matching, where cleanCandidateName()');
console.log('may match the line to a candidate name.');
console.log();
console.log('Found ' + affected.length + ' affected voter(s):\n');

for (const v of affected) {
    console.log('─'.repeat(80));
    console.log('VOTER KEY:             ' + v.voterKey);
    console.log('FIRST LINE:            "' + v.firstLine + '"');
    console.log();
    console.log('WHY IT FAILS VOTER CHECK:');
    console.log('  simplifyVoterName(first line): "' + v.simplifiedFirstLine + '"');
    console.log('  simplifyVoterName(voter key):  "' + v.simplifiedVoter + '"');
    console.log('  Match: ' + (v.simplifiedFirstLine === v.simplifiedVoter ? 'YES' : 'NO ← First line has extra chars removed by cleanCandidateName'));
    console.log();
    console.log('WHY IT FAILS DASH CHECK:');
    console.log('  Has em-dash in first line: ' + (hasEmDash(v.firstLine) ? 'YES' : 'NO ← The dash is on the next line'));
    console.log();
    console.log('CANDIDATE MATCHING:');
    console.log('  cleanCandidateName(first line): "' + v.cleanedFirstLine + '"');
    console.log('  Matched candidate:              "' + v.matchedCandidate + '"');
    console.log('  Is official candidate:          ' + (v.isCandidate ? 'YES ✓' : 'NO'));
    console.log();
    console.log('IMPACT:');
    console.log('  The voter\'s display name line would be incorrectly highlighted');
    console.log('  as a vote for "' + v.matchedCandidate + '" in the ballot review UI.');
    console.log();
    console.log('  Actual ballot rankings: ' + JSON.stringify(v.actualRankings.slice(0, 5)) + (v.actualRankings.length > 5 ? '...' : ''));
    console.log();
}

console.log('─'.repeat(80));
console.log();
console.log('SUMMARY:');
console.log('  Total affected ballots: ' + affected.length);
if (affected.length > 0) {
    console.log('  Affected voters: ' + affected.map(v => v.voterKey).join(', '));
    console.log();
    console.log('ROOT CAUSE:');
    console.log('  The voter "Dr Bacon Hair(real)" has a display name that:');
    console.log('  - Contains "(real)" suffix which gets stripped by cleanCandidateName');
    console.log('  - Results in "Dr Bacon Hair" which matches the candidate "Dr Bacon Hair"');
    console.log('  - The timestamp line is on a SEPARATE line (line 3), not the same line');
    console.log('  - So the first line has no em-dash to identify it as a voter header');
}
