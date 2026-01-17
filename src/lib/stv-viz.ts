import * as echarts from 'echarts';

export class SpeedController {
    static readonly BASE = {
        CHART_ANIMATION: 600,
        CHART_UPDATE: 400,
        PRE_ANIMATION_DISPLAY: 600,
        GOLD_BAR_SPAWN_PAUSE: 400,
        GOLD_BAR_FLIGHT: 800,
        GOLD_BAR_LANDING_PAUSE: 400,
        GOLD_BAR_CLEANUP_DELAY: 300,
        BETWEEN_ROUNDS_PAUSE: 600,
    };

    private _speedMultiplier: number = 1.0;

    get speedMultiplier(): number {
        return this._speedMultiplier;
    }

    set speedMultiplier(value: number) {
        this._speedMultiplier = Math.max(0.5, Math.min(10, value));
    }

    static sliderToSpeed(sliderValue: number): number {
        const t = sliderValue / 100;
        return 0.5 * Math.pow(20, t);
    }

    static speedToSlider(speed: number): number {
        return 100 * Math.log(speed / 0.5) / Math.log(20);
    }

    getScaled(baseTiming: number): number {
        return baseTiming / this._speedMultiplier;
    }

    get chartAnimation(): number { return this.getScaled(SpeedController.BASE.CHART_ANIMATION); }
    get chartUpdate(): number { return this.getScaled(SpeedController.BASE.CHART_UPDATE); }
    get preAnimationDisplay(): number { return this.getScaled(SpeedController.BASE.PRE_ANIMATION_DISPLAY); }
    get goldBarSpawnPause(): number { return this.getScaled(SpeedController.BASE.GOLD_BAR_SPAWN_PAUSE); }
    get goldBarFlight(): number { return this.getScaled(SpeedController.BASE.GOLD_BAR_FLIGHT); }
    get goldBarLandingPause(): number { return this.getScaled(SpeedController.BASE.GOLD_BAR_LANDING_PAUSE); }
    get goldBarCleanupDelay(): number { return this.getScaled(SpeedController.BASE.GOLD_BAR_CLEANUP_DELAY); }
    get betweenRoundsPause(): number { return this.getScaled(SpeedController.BASE.BETWEEN_ROUNDS_PAUSE); }
    get goldBarTotalDuration(): number { return this.goldBarSpawnPause + this.goldBarFlight + this.goldBarLandingPause; }
    get chartUpdateTriggerTime(): number { return this.goldBarSpawnPause + this.goldBarFlight + (this.goldBarLandingPause * 0.3); }
}

export function buildSankeyData(
    roundResults: any[],
    candidates: string[],
    fallbackQuota: number,
    outcomes: any[]
) {
    const nodes: any[] = [];
    const links: any[] = [];
    const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b8d0'];
    const candidateColors: any = {};
    candidates.forEach((c, i) => { candidateColors[c] = colors[i % colors.length]; });

    const electedInRound: any = {};
    const eliminatedInRound: any = {};
    outcomes.forEach(outcome => {
        if (outcome.type === 'elected') {
            const electedRoundData = roundResults.find(r => r.round === outcome.round);
            electedInRound[outcome.candidate] = { round: outcome.round, quota: electedRoundData?.quota ?? fallbackQuota };
        } else {
            eliminatedInRound[outcome.candidate] = outcome.round;
        }
    });

    const regularRounds = roundResults.filter(r => !r.isFinalRound);
    const finalRound = roundResults.find(r => r.isFinalRound);
    const exhaustedPerRound = new Map<number, number>();
    const augmentedRounds: any[] = [];

    regularRounds.forEach((round, roundIndex) => {
        const tally = { ...round.tally };
        Object.entries(electedInRound).forEach(([candidate, info]: [string, any]) => {
            if (info.round < round.round) tally[candidate] = info.quota;
        });
        augmentedRounds.push({ round: round.round, tally, depth: roundIndex });
        if (round.exhausted !== undefined) exhaustedPerRound.set(round.round, round.exhausted);
    });

    augmentedRounds.forEach((round) => {
        Object.entries(round.tally).forEach(([candidate, votes]: [string, any]) => {
            if (votes > 0.001) {
                const isWinner = electedInRound[candidate] !== undefined && electedInRound[candidate].round <= round.round;
                nodes.push({
                    name: `R${round.round}: ${candidate}`,
                    value: votes,
                    itemStyle: { color: isWinner ? '#10b981' : (candidateColors[candidate] || '#999'), opacity: isWinner ? 0.85 : 1 },
                    depth: round.depth
                });
            }
        });
        const exhaustedAtThisRound = exhaustedPerRound.get(round.round) ?? 0;
        if (exhaustedAtThisRound > 0.001) {
            nodes.push({ name: `R${round.round}: Exhausted`, value: exhaustedAtThisRound, itemStyle: { color: '#9ca3af' }, depth: round.depth });
        }
    });

    for (let i = 0; i < regularRounds.length - 1; i++) {
        const currentRound = regularRounds[i];
        const nextRound = regularRounds[i + 1];
        const augCurrent = augmentedRounds[i];
        const augNext = augmentedRounds[i + 1];
        const prevExhausted = exhaustedPerRound.get(currentRound.round) ?? 0;
        const nextExhausted = exhaustedPerRound.get(nextRound.round) ?? 0;
        const newExhaustedThisRound = Math.max(0, nextExhausted - prevExhausted);

        Object.entries(augCurrent.tally).forEach(([candidate, currentVotes]: [string, any]) => {
            if (currentVotes < 0.001) return;
            const sourceName = `R${currentRound.round}: ${candidate}`;
            const nextVotes = augNext.tally[candidate] || 0;
            const wasElectedThisRound = electedInRound[candidate]?.round === currentRound.round;
            const wasEliminatedThisRound = eliminatedInRound[candidate] === currentRound.round;

            if (wasElectedThisRound) {
                const winningQuota = electedInRound[candidate].quota;
                const kept = Math.min(currentVotes, winningQuota);
                const surplus = currentVotes - kept;
                if (kept > 0.001) links.push({ source: sourceName, target: `R${nextRound.round}: ${candidate}`, value: kept });
                if (surplus > 0.001) redistributeSankeyVotes(links, sourceName, currentRound, nextRound, surplus, candidate, newExhaustedThisRound);
            } else if (wasEliminatedThisRound) {
                redistributeSankeyVotes(links, sourceName, currentRound, nextRound, currentVotes, candidate, newExhaustedThisRound);
            } else if (nextVotes > 0.001) {
                const transfer = Math.min(currentVotes, nextVotes);
                if (transfer > 0.001) links.push({ source: sourceName, target: `R${nextRound.round}: ${candidate}`, value: transfer });
            }
        });

        if (prevExhausted > 0.001 && nextExhausted > 0.001) {
            links.push({ source: `R${currentRound.round}: Exhausted`, target: `R${nextRound.round}: Exhausted`, value: prevExhausted });
        }
    }

    if (regularRounds.length > 0) {
        const lastRegularRound = regularRounds[regularRounds.length - 1];
        const finalDepth = augmentedRounds.length;
        Object.entries(electedInRound).forEach(([candidate, info]: [string, any]) => {
            nodes.push({ name: `Final: ${candidate}`, value: info.quota, itemStyle: { color: '#10b981', opacity: 0.9 }, depth: finalDepth });
            links.push({ source: `R${lastRegularRound.round}: ${candidate}`, target: `Final: ${candidate}`, value: info.quota });
        });
        const finalExhausted = finalRound?.exhausted ?? (exhaustedPerRound.get(lastRegularRound.round) ?? 0);
        if (finalExhausted > 0.001) {
            nodes.push({ name: `Final: Exhausted`, value: finalExhausted, itemStyle: { color: '#9ca3af' }, depth: finalDepth });
            const lastExhausted = exhaustedPerRound.get(lastRegularRound.round) ?? 0;
            if (lastExhausted > 0.001) links.push({ source: `R${lastRegularRound.round}: Exhausted`, target: `Final: Exhausted`, value: lastExhausted });
        }
    }

    return { nodes, links };
}

function redistributeSankeyVotes(links: any[], sourceName: string, currentRound: any, nextRound: any, votesToRedistribute: number, excludeCandidate: string, newExhaustedThisRound: number) {
    if (votesToRedistribute < 0.001) return;
    const gainers: any = {};
    let totalGains = 0;
    const allCandidates = new Set([...Object.keys(currentRound.tally), ...Object.keys(nextRound.tally)]);
    allCandidates.forEach(candidate => {
        if (candidate !== excludeCandidate) {
            const gain = (nextRound.tally[candidate] || 0) - (currentRound.tally[candidate] || 0);
            if (gain > 0.001) { gainers[candidate] = gain; totalGains += gain; }
        }
    });

    const totalTransferring = totalGains + newExhaustedThisRound;
    const exhaustedProportion = totalTransferring > 0 ? newExhaustedThisRound / totalTransferring : 0;
    const exhaustedFromThis = votesToRedistribute * exhaustedProportion;
    const toDistribute = votesToRedistribute - exhaustedFromThis;

    if (totalGains < 0.001) {
        if (votesToRedistribute > 0.001) links.push({ source: sourceName, target: `R${nextRound.round}: Exhausted`, value: votesToRedistribute });
        return;
    }

    let distributed = 0;
    Object.entries(gainers).forEach(([candidate, gain]: [string, any]) => {
        const transfer = toDistribute * (gain / totalGains);
        if (transfer > 0.001) { links.push({ source: sourceName, target: `R${nextRound.round}: ${candidate}`, value: transfer }); distributed += transfer; }
    });

    const remainder = votesToRedistribute - distributed;
    if (remainder > 0.001) links.push({ source: sourceName, target: `R${nextRound.round}: Exhausted`, value: remainder });
}