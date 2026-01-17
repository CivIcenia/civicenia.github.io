export class Ballot {
    name: string;
    rankingList: number[];
    votingPower: number;
    candidateCount: number;

    constructor(name: string, rankingList: number[], votingPower: number, candidateCount: number) {
        this.name = name;
        this.rankingList = [...rankingList];
        this.votingPower = votingPower;
        this.candidateCount = candidateCount;
    }

    getRankedChoice(num: number) {
        for (let c of this.rankingList) {
            if (c !== -1) {
                if (num === 1) {
                    return c;
                } else {
                    num--;
                }
            }
        }
        return 0;
    }

    eliminate(candidateNumber: number) {
        for (let i = 0; i < this.rankingList.length; i++) {
            if (this.rankingList[i] === candidateNumber) {
                this.rankingList[i] = -1;
            }
        }
    }

    isExhausted() {
        for (let c of this.rankingList) {
            if (c !== -1 && c !== 0) {
                return false;
            }
        }
        return true;
    }
}

export function votesInFavor(ballots: Ballot[], candidateNumber: number) {
    let primaryVotes = 0;
    let tieBreakerValue = 0;
    let counted: Ballot[] = [];

    for (let b of ballots) {
        if (b.getRankedChoice(1) === candidateNumber) {
            primaryVotes += b.votingPower * 1;
            counted.push(b);
        }

        if (b.getRankedChoice(2) === candidateNumber) {
            tieBreakerValue += b.votingPower * 0.001;
        }
        if (b.getRankedChoice(3) === candidateNumber) {
            tieBreakerValue += b.votingPower * 0.000001;
        }
    }

    return { 
        primaryVotes, 
        tieBreakerValue, 
        totalScore: primaryVotes + tieBreakerValue,
        counted 
    };
}

export function extremeCandidate(ballots: Ballot[], mode: number, candidateCount: number) {
    if (!ballots || ballots.length === 0) {
        return -1;
    }

    const candidates = new Array(candidateCount).fill(0);

    for (let i = 0; i < candidates.length; i++) {
        candidates[i] = votesInFavor(ballots, i + 1).totalScore;
    }

    let toReturn = -1;
    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i] !== 0) {
            toReturn = i + 1;
            break;
        }
    }

    if (toReturn === -1) {
        if (mode === 1) {
            return -1;
        } else {
            return 1; // Default to first candidate if everyone is at 0 for elimination
        }
    }

    for (let i = 0; i < candidates.length; i++) {
        if (mode * candidates[i] > mode * candidates[toReturn - 1] && candidates[i] !== 0) {
            toReturn = i + 1;
        }
    }

    return toReturn;
}

export function eliminateCandidate(ballots: Ballot[], candidateNumber: number) {
    for (let b of ballots) {
        b.eliminate(candidateNumber);
    }
}

export function getCandidateNumber(name: string, candidateReferences: string[]): number {
    const normalized = name.trim().toLowerCase();
    for (let i = 0; i < candidateReferences.length; i++) {
        if (candidateReferences[i].toLowerCase() === normalized) {
            return i + 1;
        }
    }
    return 0;
}

export function STV(ballots: Ballot[], k: number, candidateReferences: string[], logCallback: (msg: string, type?: string) => void) {
    const candidateCount = candidateReferences.length;
    logCallback(`STV with ${k} winners, ${candidateCount} candidates, ${ballots.length} ballots\n\n`);

    const winners: string[] = [];
    let totalVote = ballots.length;
    const roundResults: any[] = [];
    let roundNumber = 1;
    let cumulativeExhausted = 0;

    while (winners.length < k) {
        logCallback(`--- Round ${roundNumber} ---\n`);

        const roundTally: Record<string, number> = {};
        for (let i = 0; i < candidateCount; i++) {
            const candidateIndex = i + 1;
            const { primaryVotes } = votesInFavor(ballots, candidateIndex);
            if (primaryVotes > 0) {
                roundTally[candidateReferences[i]] = primaryVotes;
            }
        }

        const tallyEntries = Object.entries(roundTally).sort((a, b) => b[1] - a[1]);
        for (const [candidate, votes] of tallyEntries) {
            logCallback(`  ${candidate}: ${(votes as number).toFixed(3)} votes\n`);
        }
        logCallback(`\n`);

        const topCandidate = extremeCandidate(ballots, 1, candidateCount);

        if (topCandidate === -1) {
            logCallback(`\nERROR: Cannot determine top candidate. Stopping election.\n`, 'error');
            break;
        }

        const { primaryVotes: topCandidatePrimaryVotes, totalScore: topCandidateTotalScore, counted: votesForTopCandidate } = votesInFavor(ballots, topCandidate);
        const quota = totalVote / (k + 1);

        const roundData: any = {
            round: roundNumber,
            tally: roundTally,
            quota: quota,
            exhausted: cumulativeExhausted,
            tallyResults: []
        };

        if (topCandidateTotalScore >= quota) {
            const candidateName = candidateReferences[topCandidate - 1];
            winners.push(candidateName);

            logCallback(`<span class="stv-log-win">✓ WIN: ${candidateName} (${topCandidateTotalScore.toFixed(3)} votes, Quota: ${quota.toFixed(3)})\n</span>`, 'win');

            roundData.tallyResults.push({
                elected: candidateName,
                transfers: {}
            });

            eliminateCandidate(ballots, topCandidate);

            // Ensure surplus fraction is not negative (can happen if winning via tie-breakers)
            const surplusFraction = Math.max(0, (topCandidatePrimaryVotes - quota) / topCandidatePrimaryVotes);

            for (let b of votesForTopCandidate) {
                b.votingPower *= surplusFraction;
            }
        } else {
            const bottomCandidate = extremeCandidate(ballots, -1, candidateCount);

            if (bottomCandidate === -1) {
                logCallback(`\nERROR: Cannot determine bottom candidate. Stopping election.\n`, 'error');
                break;
            }

            const candidateName = candidateReferences[bottomCandidate - 1];
            const { primaryVotes: bottomVotes, counted: ballotsForBottom } = votesInFavor(ballots, bottomCandidate);

            logCallback(`<span class="stv-log-elim">✗ ELIM: ${candidateName} (${bottomVotes.toFixed(3)} votes from ${ballotsForBottom.length} ballots)\n</span>`, 'elim');

            roundData.tallyResults.push({
                eliminated: candidateName,
                transfers: {}
            });

            eliminateCandidate(ballots, bottomCandidate);

            for (let b of ballotsForBottom) {
                const nextChoice = b.getRankedChoice(1);
                const nextName = nextChoice > 0 ? candidateReferences[nextChoice - 1] : '[exhausted]';
                logCallback(`  ${b.name} (power: ${b.votingPower.toFixed(3)}) → ${nextName}\n`);
            }
        }

        roundResults.push(roundData);
        roundNumber++;

        let exhaustedCount = 0;
        let exhaustedPower = 0;
        for (let b of ballots) {
            if (b.isExhausted() && b.votingPower > 0) {
                exhaustedCount++;
                exhaustedPower += b.votingPower;
                totalVote -= b.votingPower;
                b.votingPower = 0;
            }
        }
        cumulativeExhausted += exhaustedPower;
        if (exhaustedCount > 0) {
            logCallback(`  ${exhaustedCount} ballot(s) exhausted (total power: ${exhaustedPower.toFixed(3)})\n`);
        }
        logCallback(`  Total remaining voting power: ${totalVote.toFixed(3)}\n\n`);
    }

    const finalRoundTally: Record<string, number> = {};
    for (const winner of winners) {
        const winRound = roundResults.find(r => 
            r.tallyResults.some((tr: any) => tr.elected === winner)
        );
        if (winRound) {
            finalRoundTally[winner] = winRound.quota;
        }
    }

    const finalQuota = totalVote / (k + 1);
    roundResults.push({
        round: roundNumber,
        tally: finalRoundTally,
        quota: finalQuota,
        exhausted: cumulativeExhausted,
        tallyResults: [],
        isFinalRound: true
    });

    return { winners, roundResults };
}
