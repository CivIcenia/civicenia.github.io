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
    "threshold": "7.5"
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
