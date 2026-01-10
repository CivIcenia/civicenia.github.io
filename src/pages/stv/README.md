# STV Election Visualization

This directory contains components and pages for visualizing Single Transferable Vote (STV) election results with animated bar charts and Sankey diagrams.

## Features

### 1. **Animated Bar Chart** ([visualize.astro](visualize.astro))
- Round-by-round vote tallies displayed as animated bars
- **Vote Redistribution Animation**: When candidates exceed the quota and are elected, their bars turn green with a checkmark and freeze at the quota level
- **Consistent Y-Axis Scaling**: The Y-axis remains constant across all rounds for easy comparison
- **Winner Visualization**: Elected candidates are highlighted in green with a border
- Play/pause controls for automatic animation through rounds
- Slider for manual round navigation
- Adjustable playback speed (slow/normal/fast)
- Download charts as PNG images
- Fully responsive for mobile and desktop

### 2. **Sankey Diagram** ([SankeyDiagram.astro](../components/SankeyDiagram.astro))
- Visualizes vote transfers between rounds
- Shows how votes flow from eliminated or elected candidates to remaining candidates
- Color-coded by candidate for easy tracking
- Proportional vote redistribution based on actual tally changes
- Interactive tooltips showing transfer amounts

### 3. **Election Outcomes Summary**
- Lists all elected and eliminated candidates
- Shows the round in which each outcome occurred
- Visual indicators (✓ for elected, ✗ for eliminated)

## Components

### AnimatedBarChart.astro
Located in `src/components/AnimatedBarChart.astro`

**Props:**
```typescript
{
  roundResults: Array<{
    round: number;
    tally: { [candidate: string]: number };
  }>;
  candidates?: string[];
  quota?: number;
}
```

### SankeyDiagram.astro
Located in `src/components/SankeyDiagram.astro`

**Props:**
```typescript
{
  roundResults: Array<{
    round: number;
    tally: { [candidate: string]: number };
  }>;
  candidates?: string[];
  quota?: number;
}
```

## Usage

### Viewing Election Results

1. Navigate to `/stv/visualize` in your browser
2. Click "Load Demo Data" to see a sample election, or
3. Upload an RCVis-format JSON file from the STV Calculator

### Expected JSON Format

The visualization expects RCVis-compatible JSON files:

```json
{
  "config": {
    "contest": "Election Name",
    "date": "2026-01-09",
    "threshold": "7.500"
  },
  "results": [
    {
      "round": 1,
      "tally": {
        "Candidate A": "10.000",
        "Candidate B": "8.000"
      },
      "tallyResults": [
        { "elected": "Candidate A", "transfers": {} }
      ]
    }
  ]
}
```

### Integration in Other Pages

```astro
---
import AnimatedBarChart from "@components/AnimatedBarChart.astro";
import SankeyDiagram from "@components/SankeyDiagram.astro";

const roundResults = [
  { round: 1, tally: { Alice: 10, Bob: 8 } },
  { round: 2, tally: { Alice: 12, Bob: 7 } }
];
---

<AnimatedBarChart roundResults={roundResults} quota={8} />
<SankeyDiagram roundResults={roundResults} quota={8} />
```

## Technical Details

### Libraries Used
- **ECharts 6.0.0** (Apache 2.0 License) - Chart rendering and animations
- All code is original or based on ECharts official documentation
- **No GPL code** - All components are MIT/Apache 2.0 compatible

### Key Features Implementation

#### Vote Redistribution Animation
When a candidate is elected:
1. Their bar turns green with a green border
2. A checkmark (✓) appears next to their vote count
3. The bar height freezes at the quota level for all subsequent rounds
4. The Y-axis scaling remains consistent across all rounds
5. Surplus votes are shown redistributing to other candidates in the Sankey diagram

#### Sankey Vote Flow Calculation
The Sankey diagram estimates vote transfers by:
1. Tracking each candidate's vote total between consecutive rounds
2. If votes decrease (surplus or elimination), distributing proportionally to candidates who gained votes
3. If votes increase, showing incoming transfers from eliminated/elected candidates
4. Using gradient coloring to show the flow direction

### Performance Considerations
- Charts are rendered client-side using Canvas
- Automatic resizing with ResizeObserver
- Debounced animations for smooth playback
- Minimal re-renders during round transitions

## Accessibility
- Keyboard navigation supported for all controls
- Focus indicators on interactive elements
- Color-blind friendly: green for elected, red for quota line
- High contrast text labels
- Semantic HTML structure

## Browser Compatibility
- Modern browsers with ES6+ support
- Canvas API required
- Tested on Chrome, Firefox, Edge, Safari

## Future Enhancements
- [ ] Export Sankey diagram as PNG
- [ ] Toggle between grouped and stacked bar charts
- [ ] Highlight specific candidate paths in Sankey
- [ ] Comparison view for multiple elections
- [ ] Dark mode support
- [ ] Animated particle effects for vote transfers

## License
Apache 2.0 (matching ECharts license)

## Credits
- Built with [ECharts](https://echarts.apache.org/) by Apache Software Foundation
- Follows RCVis JSON format for interoperability
- Created for the Icenia government website


## IcenianSTV by Yodabird19
```
import numpy as np

# Takes in a list of *strings* corresponding to candidate rankings,
# which may be up to as long as (but not longer than) the number of candidates,
# and a list of all the candidates
# and outputs a numeric ranking list (of the form used by the rest of this program)
# with names corresponding to their candidate numbers given in the candidate references
def ballotFromNames(name, l, candidateReferences):
    rankingList = []
    for candidateName in l:
        num = getCandidateNumber(candidateName,candidateReferences)
        if num > 0:
            rankingList.append(num)
        else:
            print(name + "'s ballot has invalid candidate '" + candidateName + "'.")
            return None
    for i in range(len(l),len(candidateReferences)):
        rankingList.append(0)
    return Ballot(name, rankingList, 1, len(candidateReferences))

# Gets the numeric candidate identifier for a candidate name,
# based on a list of references
# Returns -2 (error code for "invalid candidate") if there is none
def getCandidateNumber(candidateName, candidateReferences):
    for i in range(len(candidateReferences)):
        if candidateReferences[i] == candidateName:
            return i+1
    return -2

# Takes in a list, where each index is a ranking, and each value is a candidate
# (ex. index 4 has value 8 -> voter has candidate #8 in 5th rank)
# Validates that it is of the correct form
# A value of 0 corresponds to a blank ranking
# (These can only be at the bottom of the ballot)
# A value of -1 corresponds to an eliminated candidate
# NOTE: This function will error if a ballot with -1 is put in
# Also takes in the number of candidates running
# (so if there are 26 candidates, input 26 for the second argument)
def validateRankingList(l, candidateCount):
    presence = np.zeros(candidateCount)
    zero = False
    if len(l) != candidateCount:
        return (False, "Ballot has incorrect length " + str(len(l)) + " for " + str(candidateCount) + " candidates")
    for c in l:
        if c > candidateCount or c < 0:
            return (False, "Ballot has invalid candidate number " + str(c))
        if c != 0:
            presence[c-1] += 1
            if presence[c-1] > 1:
                return (False, "Ballot has more than one ranking for candidate number " + str(c))
        if c == 0:
            zero = True
        if zero and c != 0:
            return (False, "Ballot has non-trailing blank rankings")
    return (True, "")

class Ballot:
    def __init__(self, name, rankingList, votingPower, candidateCount):
        valid = validateRankingList(rankingList, candidateCount)
        if (valid[0]):
            self.name = name
            self.rankingList = rankingList
            self.votingPower = votingPower
        else:
            print(name + " is invalid: " + valid[1])

    # num = 1 for top choice
    # num = 2 for second top choice
    # etc
    def getRankedChoice(self, num):
        for c in self.rankingList:
            if c != -1:
                if num == 1:
                    #print(self.name+" top choice of "+str(c)+": "+str(self.rankingList))
                    return c
                else:
                    num -= 1
        return 0

    def eliminate(self,candidateNumber):
        for i in range(len(self.rankingList)):
            if self.rankingList[i] == candidateNumber:
               self.rankingList[i] = -1

    def isExhausted(self):
        for c in self.rankingList:
            if c != -1 and c != 0:
                return False
        return True

# Assesses the number of votes (taking weighting ito account) in favor
# of the candidate
# For tiebreaking purposes, 2nd-choice votes are included x1/1000, and
# 3rd-choice as x1/1000000 (Subsection 5)
def votesInFavor(ballots, candidateNumber):
    count = 0
    counted = []
    for b in ballots:
        if (b.votingPower > 1):
            print (b.name+"'s ballot has voting power "+str(b.votingPower)+"!")
        if b.getRankedChoice(1) == candidateNumber:
            count += b.votingPower*1
            counted.append(b)
        if b.getRankedChoice(2) == candidateNumber:
            count += b.votingPower*1/1000
        if b.getRankedChoice(3) == candidateNumber:
            count += b.votingPower*1/1000000
    #print("Candidate " + str(candidateNumber) + " has "  + str(count) + " votes in favor from " + str(len(counted)) + " ballots.")
    return (count, counted)

# Gets either the top-ranked or lowest-ranked candidate
# mode  1: top ranked
# mode -1: lowest ranked
def extremeCandidate(ballots, mode):
    candidates = np.zeros(len(ballots[0].rankingList))
    for i in range(len(candidates)):
        candidates[i] = votesInFavor(ballots, i+1)[0]
    toReturn = -1/2
    for i in range(len(candidates)):
        if (candidates[i] != 0):
            toReturn = i+1
            break
    if toReturn == -1/2:
        print("TORETURN = 1/2:")
        for b in ballots:
            print(b.name+": " + str(b.rankingList))
    #print(candidates)
    for i in range(len(candidates)):
        if (mode*candidates[i] > mode*candidates[toReturn-1] and candidates[i] != 0):
            toReturn = i+1
    #print("Votes in favor of candidate",toReturn,":",str(candidates[toReturn-1]))
    #print("Votes in favor of candidate",1,":",str(candidates[0+1]))
    return toReturn

# Eliminates a candidate from a list of ballots
def eliminateCandidate(ballots, candidateNumber):
    #print("ELIMINATING CANDIDATE " + str(candidateNumber))
    for b in ballots:
        b.eliminate(candidateNumber)

#
def STV(ballots, k, candidateReferences):
    print("STV with",str(k),"winners,",str(len(ballots[0].rankingList)),"candidates,",str(len(ballots)),"ballots")
    #for b in ballots:
        #print(b.name + ": " + str(b.rankingList))
    winners = []
    totalVote = len(ballots)
    # Subsection 2
    while (len(winners) < k):
        # Subsection 3
        topCandidate = extremeCandidate(ballots,1)
        (topCandidateVotes, votesForTopCandidate) = votesInFavor(ballots, topCandidate)
        if topCandidateVotes >= totalVote/(k+1):
            # Paragraph 3(a)
            winners.append(candidateReferences[topCandidate-1])
            # Paragraph 3(b)
            print ("win",candidateReferences[topCandidate-1])#,topCandidateVotes,str(totalVote/(k+1)))
            eliminateCandidate(ballots, topCandidate)
            #print("quota:",str(np.ceil(totalVote/(k+1))),"from total remaining voting power of",str(totalVote))
            for b in votesForTopCandidate:
                b.votingPower *= (topCandidateVotes-totalVote/(k+1))/topCandidateVotes
            # Paragraph 3(c)
        # Subsection 4
        else:
            # Paragraph 4(a)
            bottomCandidate = extremeCandidate(ballots, -1)
            print("elim",candidateReferences[bottomCandidate-1])#,str(votesInFavor(ballots, bottomCandidate)[0]),str(totalVote/(k+1)))
            eliminateCandidate(ballots, bottomCandidate)
        # Subsection 6
        for b in ballots:
            if b.isExhausted():
                #print(b.name+"'s ballot is exhausted!")
                totalVote -= b.votingPower
                #print("totalVote has been reduced by " + str(b.votingPower) + "! It is now " + str(totalVote))
                b.votingPower = 0
    return winners

cand = ["Wyatt","Xavier","Yvette","Zoe"]
b1 = ballotFromNames("Alice", ["Yvette", "Wyatt", "Xavier", "Zoe"], cand)
b2 = ballotFromNames("Bob", ["Zoe", "Xavier", "Yvette"], cand)
b3 = ballotFromNames("Claire", ["Wyatt"], cand)
b4 = ballotFromNames("David", ["Yvette", "Zoe", "Wyatt", "Xavier"], cand)
b5 = ballotFromNames("Eliza", ["Wyatt", "Zoe", "Xavier"], cand)
bs = [b1,b2,b3,b4,b5]

print(STV(bs,1,cand))
```