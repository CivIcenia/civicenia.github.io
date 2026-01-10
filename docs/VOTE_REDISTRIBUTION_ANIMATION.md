# Vote Redistribution Animation

## Overview

The STV Results Visualization now includes an animated vote redistribution feature that shows how surplus votes from winning candidates are transferred to other candidates in real-time.

## Features

### 1. **Surplus Vote Animation**
When a candidate exceeds the quota and wins:
- The chart briefly pauses to show the winner at their full vote count
- Surplus votes (votes above the quota) are visually represented as golden/yellow bars
- These bars "fly" from the top of the winner's bar to the tops of recipient candidates' bars
- The animation uses smooth cubic easing for natural movement
- After the transfer animation completes, the winner's bar is fixed at the quota level

### 2. **Frozen Winner Display**
Once a candidate wins:
- Their bar is frozen at exactly the quota value for all subsequent rounds
- The bar turns green to indicate election status
- A checkmark (✓) appears above the bar
- The bar has a green border to further distinguish it

### 3. **Consistent Y-Axis Scaling**
- All rounds use the same Y-axis maximum value
- This ensures visual consistency and makes vote changes easy to compare
- The quota line remains at the same visual position throughout

## Implementation Details

### Vote Transfer Calculation

```typescript
function calculateVoteTransfers(currentRoundIndex: number) {
    // 1. Check if anyone was elected in current round
    // 2. Calculate their surplus (votes - quota)
    // 3. Compare current round vs next round tallies
    // 4. Identify recipients based on vote increases
    // 5. Return array of transfer objects with amounts
}
```

### Animation Sequence

1. **Detection**: When advancing from round N to N+1, check if someone won in round N
2. **Setup**: Display round N with winner at full vote count
3. **Pause**: Brief 500ms delay before animation starts
4. **Transfer Animation**:
   - Create ECharts graphics (golden rectangles)
   - Position at top of winner's bar (at quota level)
   - Height represents transfer amount
   - Animate position from winner to recipients over 1 second
   - Fade out as they reach destination
5. **Completion**: Remove graphics and display next round with winner frozen

### ECharts Graphics API Usage

```typescript
const flyingBar = {
    type: 'rect',
    shape: { x, y, width, height },
    style: {
        fill: '#fbbf24',  // Golden yellow
        opacity: 0.8,
        shadowBlur: 10
    },
    keyframeAnimation: [{
        duration: 1000,
        easing: 'cubicInOut',
        keyframes: [
            { percent: 0, ... },  // Start position
            { percent: 0.5, ... }, // Mid-animation
            { percent: 1, ... }    // End position (fade out)
        ]
    }]
};
```

## User Interaction

### Animation Behavior
- **Play Button**: Shows animations as rounds advance automatically
- **Next Button**: Shows animation when manually advancing forward
- **Previous Button**: Skips animation when going backward
- **Slider**: Skips animation for instant round jumping
- **Speed Control**: Affects both round transition and animation timing

### Visual Indicators
- **Golden bars**: Active surplus transfer
- **Green bars**: Elected candidates (frozen)
- **Red dashed line**: Quota threshold
- **Bar labels**: Vote counts with checkmarks for winners

## Technical Considerations

### Coordinate System
- Uses `convertToPixel()` to transform data coordinates to screen pixels
- Calculates bar positions and heights dynamically
- Adapts to different chart sizes and aspect ratios

### Performance
- Animation duration: 1000ms (adjustable via speed control)
- Graphics are removed after animation to prevent memory buildup
- Uses ECharts' optimized rendering engine

### Edge Cases
- No animation if no surplus transfers exist
- Handles multiple simultaneous winners
- Gracefully skips animation if data is incomplete
- Works with any number of candidates and rounds

## Browser Compatibility

- Requires modern browser with ECharts support
- Tested on Chrome, Firefox, Edge, Safari
- Uses standard ES6+ JavaScript (transpiled by Astro)
- No external animation libraries required

## Future Enhancements

Potential improvements:
1. **Multi-stage animation**: Show redistribution in multiple waves if quota is exceeded multiple times
2. **Eliminated candidate transfers**: Animate vote redistribution from eliminated candidates
3. **Vote path tracing**: Show individual vote "particles" moving between candidates
4. **Customizable colors**: Allow users to pick transfer animation colors
5. **Sound effects**: Optional audio cues for transfers and wins

## Code Location

- **Main Implementation**: [`src/pages/stv/visualize.astro`](../src/pages/stv/visualize.astro)
- **Functions**:
  - `calculateVoteTransfers()`: Lines 388-443
  - `animateVoteTransfers()`: Lines 520-601
  - `showRound()`: Lines 606-634
- **Related**: Sankey diagram also visualizes transfers (static view)

## Testing

To test the animation:

1. Navigate to `/stv/visualize`
2. Load demo data or upload an election JSON file
3. Use the "Next" button to advance through rounds
4. Watch for golden bars flying when candidates win

Test data: The rcvis-election-2026-01-09.json file shows multiple winners with visible surplus transfers.

---

**License**: Apache 2.0 (matches ECharts license)  
**Dependencies**: ECharts ^5.6.1 (Apache 2.0)
