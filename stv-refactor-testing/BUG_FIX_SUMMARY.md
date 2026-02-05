# STV Calculator Bug Fix - Voter Header Detection

## Issue Summary

**Bug:** Post-refactor STV calculator produced different vote counts compared to pre-refactor version.

**Root Cause:** The `classifyOriginalLine` function failed to recognize voter header lines when:
- Voter display name differed from simplified voter key (e.g., "Dr Bacon Hair(real)" vs "drbaconhair")
- Display name was on a separate line from the timestamp (Discord format variation)
- Line didn't contain an em-dash

**Impact:**
- Voter `drbaconhair` had their display name "Dr Bacon Hair(real)" misclassified as a vote for candidate "Dr Bacon Hair"
- **Pre-refactor:** First choice = toasttastesprettygood (14 total first-choice votes)
- **Post-refactor:** First choice = Dr Bacon Hair (13 vs 14 vote error)
- This cascaded through all rounds due to different surplus transfer calculations

## Vote Count Differences

### Round 1
| Candidate | PRE | POST | Diff |
|-----------|-----|------|------|
| Dr Bacon Hair | 8.000 | 9.000 | +1.000 |
| toasttastesprettygood | 14.000 | 13.000 | -1.000 |

All subsequent rounds diverged due to:
- Different surplus fractions (14-7.333)/14 vs (13-7.333)/13
- Different vote transfer amounts
- Different exhausted vote totals

## Fix Implementation

**Location:** `classifyOriginalLine` function in [src/pages/stv/index.astro](../src/pages/stv/index.astro)

**Approach:** Combined strategy (Options A + C with B fallback)

1. **Primary:** Extract canonical voter name from ballot header using `extractVoterName`
2. **Compare:** Check if simplified forms match OR one starts with the other
3. **Fallback:** Em-dash detection (existing)

### Code Changes

```typescript
// Before (strict equality check only)
if (simplifiedLine && simplifiedVoter && simplifiedLine === simplifiedVoter) {
    return { type: 'voter' };
}

// After (lenient matching with extracted voter)
const originalText = parsedData.originalBallotText.get(voter) || '';
const firstLine = originalText.split('\n')[0];
const extractedVoter = extractVoterName(firstLine);
const simplifiedExtracted = simplifyVoterName(extractedVoter || '');

if (simplifiedLine && simplifiedVoter && simplifiedExtracted) {
    if (simplifiedLine === simplifiedVoter ||
        simplifiedLine === simplifiedExtracted ||
        simplifiedLine.startsWith(simplifiedVoter) ||
        simplifiedVoter.startsWith(simplifiedLine) ||
        simplifiedLine.startsWith(simplifiedExtracted) ||
        simplifiedExtracted.startsWith(simplifiedLine)) {
        return { type: 'voter' };
    }
}
```

## Test Results

✅ All test cases pass:
- **drbaconhair:** Display name with "(real)" suffix now correctly identified as voter header
- **alzubloxxer11:** Standard format continues to work
- **speedyjjustice:** Split header/timestamp format handled correctly
- **hsmnewfriend:** Exact match cases still work

## Expected Outcomes

After this fix:
1. ✅ `drbaconhair` ballot will correctly have first choice = toasttastesprettygood
2. ✅ Round 1 vote counts will match pre-refactor (Dr Bacon Hair: 8, toasttastesprettygood: 14)
3. ✅ All subsequent rounds will match due to correct surplus calculations
4. ✅ Final winners and vote distributions will be identical to pre-refactor

## Risk Assessment

**Risk Level:** Low

**Rationale:**
- Local, targeted change to single function
- Only affects voter header detection logic
- Lenient matching is conservative (multiple fallback checks)
- All test cases pass
- No breaking changes to API or data structures

## Verification Steps

To verify the fix works correctly:

1. Run the verification script:
   ```bash
   bun run stv-refactor-testing/verify-fix.js
   ```

2. Run comprehensive tests:
   ```bash
   bun run stv-refactor-testing/test-all-cases.js
   ```

3. Test with actual election data:
   - Load the January 2026 Senate Election data
   - Process through ballot review
   - Compare Round 1 results to PRE_REFACTOR
   - Verify Dr Bacon Hair: 8.000, toasttastesprettygood: 14.000

---

**Date Fixed:** February 5, 2026
**Files Modified:**
- `src/pages/stv/index.astro` (classifyOriginalLine function)
