export function cleanCandidateName(name: string) {
    return name
        .replace(/@/g, '')
        .replace(/^\d+\.?\s*/, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/["']/g, '')
        .trim()
        .replace(/\s+/g, ' ');
}

export function simplifyVoterName(name: string) {
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
        const regex = new RegExp(`^${prefix}\\s+`, 'i');
        simplified = simplified.replace(regex, '');
    }
    simplified = simplified
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
    return simplified || name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function extractVoterName(line: string) {
    const timestampMatch = line.match(/^(.+?)\s*—\s*(\d{1,2}\/\d{1,2}\/\d{4}|Yesterday at|Today at)/i);
    if (timestampMatch) return timestampMatch[1].trim();
    const parts = line.split(/\s*—\s*/);
    return parts.length > 0 ? parts[0].trim() : line.trim();
}

export function parseDiscordBallots(text: string) {
    const lines = text.split('\n');
    const ballots: Array<{voter: string, rankings: string[]}> = [];
    const allFoundNames = new Set<string>();
    const originalBallotText = new Map<string, string>();
    
    let currentVoter: string | null = null;
    let currentRankings: string[] = [];
    let ballotStartLine = 0;
    const voterBallotCounts = new Map<string, number>();
    
    const isTimestampLine = (line: string) => /—\s*(\d{1,2}\/\d{1,2}\/\d{4}|Yesterday at|Today at)/i.test(line);
    const getNextNonEmptyLine = (startIndex: number) => {
        for (let j = startIndex + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine) return { line: nextLine, index: j };
        }
        return null;
    };

    const saveBallot = (voterBaseName: string, rankings: string[], endLineIndex: number) => {
        const count = (voterBallotCounts.get(voterBaseName) || 0) + 1;
        voterBallotCounts.set(voterBaseName, count);
        const voter = count > 1 ? `${voterBaseName}#${count}` : voterBaseName;
        ballots.push({ voter, rankings: [...rankings] });
        originalBallotText.set(voter, lines.slice(ballotStartLine, endLineIndex + 1).join('\n'));
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const hasTimestamp = isTimestampLine(line);
        const maybeCandidate = cleanCandidateName(line);
        let isVoterNameBeforeTimestamp = false;
        if (!hasTimestamp && maybeCandidate) {
            const nextNonEmpty = getNextNonEmptyLine(i);
            if (nextNonEmpty && isTimestampLine(nextNonEmpty.line)) {
                const nextLineVoterName = extractVoterName(nextNonEmpty.line);
                if (!nextLineVoterName || nextLineVoterName.length < 2 || nextLineVoterName.startsWith('—')) {
                    isVoterNameBeforeTimestamp = true;
                }
            }
        }

        if (hasTimestamp || isVoterNameBeforeTimestamp) {
            if (currentVoter && currentRankings.length > 0) saveBallot(currentVoter, currentRankings, i - 1);
            ballotStartLine = i;
            if (hasTimestamp) {
                currentVoter = simplifyVoterName(extractVoterName(line));
                currentRankings = [];
                const afterTimestamp = line.split(/\d{2}:\d{2}/)[1];
                if (afterTimestamp) {
                    const candidateName = cleanCandidateName(afterTimestamp);
                    if (candidateName && candidateName !== currentVoter) {
                        currentRankings.push(candidateName);
                        allFoundNames.add(candidateName);
                    }
                }
            } else if (isVoterNameBeforeTimestamp) {
                currentVoter = simplifyVoterName(maybeCandidate);
                currentRankings = [];
                const nextNonEmpty = getNextNonEmptyLine(i);
                if (nextNonEmpty) i = nextNonEmpty.index;
            }
        } else {
            const candidateName = cleanCandidateName(line);
            if (!candidateName || candidateName.length < 2 || /^[\d\.\)\-]+$/.test(candidateName)) continue;
            const lowerName = candidateName.toLowerCase();
            if (lowerName.includes('barred from') || lowerName.includes('write-in')) continue;
            if (currentVoter) {
                currentRankings.push(candidateName);
                allFoundNames.add(candidateName);
            }
        }
    }
    if (currentVoter && currentRankings.length > 0) saveBallot(currentVoter, currentRankings, lines.length - 1);
    return { ballots, allFoundNames: Array.from(allFoundNames), originalBallotText };
}
