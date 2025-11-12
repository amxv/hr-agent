---
name: verify-all-phases
allowed-tools: Read, Bash(ls:*), Bash(grep:*), Bash(mkdir:*), Task, TodoWrite
argument-hint: [feature_id] [optional_notes_in_quotes]
description: Verify all phases of a completed feature implementation in parallel.
disable-model-invocation: true
---

The current time is !`date "+%Y-%m-%d %H:%M:%S"`

## Task

You are orchestrating the comprehensive verification of a completed feature implementation by coordinating multiple phase-verifier subagents in parallel. Your role is to ensure all phases are thoroughly reviewed and to provide a consolidated verification report.

<details>
$ARGUMENTS
</details>

## Steps

### Step 1: Gather Context and Validate Feature

In the details above, you will find the feature id.

1. Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.

   If the feature doesn't exist, immediately tell me that the feature doesn't exist.

2. Read the feature summary document to understand:
   - The feature overview
   - The complete list of phases
   - The scope of work

   Read: `gg/features/<feature-slug>/summary.md`

3. Parse the "Phase List" section to determine the total number of phases (e.g., Phase 1, Phase 2, Phase 3, etc.)

### Step 2: Create Verification Directory

Ensure the verification output directory exists:

```bash
mkdir -p gg/agent-outputs/verification
```

### Step 3: Create Master Todo List

Using the TodoWrite tool, create a high-level todo list with one item per phase:

```
- [ ] Verify Phase 1: [Phase Name]
- [ ] Verify Phase 2: [Phase Name]
- [ ] Verify Phase 3: [Phase Name]
...
```

Mark all phases as `pending` initially.

### Step 4: Launch Phase Verifiers in Parallel

IMPORTANT: Unlike implementation, verification can be done in parallel for efficiency.

Mark all phases as `in_progress` in your master todo list, then spawn a `phase-verifier` subagent for EACH phase in a single message with multiple Task tool calls.

For each phase, use this prompt:

```
Verify Phase {phase-number} of feature {feature-id}.

Feature ID: {feature-id}
Feature Slug: {feature-slug}
Phase Number: {phase-number}

Please verify the implementation following the systematic verification process:
1. Read all required documents
2. Read all implemented files
3. Verify each change against the phase plan
4. Analyze for bugs and issues
5. Generate verification report at: gg/agent-outputs/verification/{feature-id}.{phase-number}-verification.md
6. Report back with the file path and verdict

{optional_notes_if_any}
```

Wait for ALL phase-verifier subagents to complete.

### Step 5: Collect Verification Reports

After all phase-verifiers complete:

1. Mark all phases as `completed` in your master todo list

2. Read all verification reports in parallel using the Read tool:
   - `gg/agent-outputs/verification/{feature-id}.1-verification.md`
   - `gg/agent-outputs/verification/{feature-id}.2-verification.md`
   - `gg/agent-outputs/verification/{feature-id}.3-verification.md`
   - ... (for all phases)

### Step 6: Synthesize Consolidated Report

Analyze all verification reports and produce a comprehensive summary for the user:

```markdown
## Feature Verification Report: {feature-slug}

### Overview
- Feature ID: {feature-id}
- Total Phases: {N}
- Verification Date: {date}

### Phase-by-Phase Summary

#### Phase 1: [Phase Name]
- **Verdict**: [PASS/PASS WITH MINOR ISSUES/NEEDS FIXES/INCOMPLETE]
- **Summary**: [One-line summary]
- **Key Findings**: [Brief bullet points]
- **Report**: gg/agent-outputs/verification/{feature-id}.1-verification.md

#### Phase 2: [Phase Name]
- **Verdict**: [PASS/PASS WITH MINOR ISSUES/NEEDS FIXES/INCOMPLETE]
- **Summary**: [One-line summary]
- **Key Findings**: [Brief bullet points]
- **Report**: gg/agent-outputs/verification/{feature-id}.2-verification.md

[... repeat for all phases]

### Overall Assessment

#### ✅ Strengths
[Highlights from across all phases]

#### ⚠️ Issues to Address
[Consolidated list of all issues found, grouped by severity]

**Critical Issues** (must fix):
- [Issue 1 with file:line reference]
- [Issue 2 with file:line reference]

**Minor Issues** (should fix):
- [Issue 1 with file:line reference]
- [Issue 2 with file:line reference]

**Improvements** (nice to have):
- [Suggestion 1]
- [Suggestion 2]

#### 📊 Statistics
- Phases with PASS: {X}
- Phases with PASS WITH MINOR ISSUES: {Y}
- Phases with NEEDS FIXES: {Z}
- Phases with INCOMPLETE: {W}

### Final Verdict

**[OVERALL VERDICT]**

[Explanation of the overall verdict based on individual phase verdicts]

### Recommended Next Steps

1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

### Verification Reports

All detailed verification reports are available at:
- gg/agent-outputs/verification/{feature-id}.1-verification.md
- gg/agent-outputs/verification/{feature-id}.2-verification.md
- ... [list all]
```

## Determining Overall Verdict

Use the following logic to determine the overall verdict:

- **PASS**: All phases are PASS
- **PASS WITH MINOR ISSUES**: All phases are PASS or PASS WITH MINOR ISSUES, at least one is PASS WITH MINOR ISSUES
- **NEEDS FIXES**: At least one phase is NEEDS FIXES
- **INCOMPLETE**: At least one phase is INCOMPLETE

## Important Guidelines

### Orchestration Principles

1. **Parallel Execution**: Unlike implementation, verification can run in parallel for all phases. Launch ALL phase-verifier subagents at once in a single message with multiple Task tool calls.

2. **Comprehensive Review**: Ensure every phase is thoroughly verified before providing the overall assessment.

3. **Issue Consolidation**: Group similar issues across phases and prioritize by severity.

4. **Clear Communication**: Provide actionable feedback with specific file paths and line numbers.

5. **Balanced Perspective**: Highlight both strengths and weaknesses in the implementation.

### Communication Guidelines

- Be clear and concise in your consolidated report
- Use formatting (bold, bullet points, sections) to make the report easy to scan
- Include specific file references for all issues
- Provide context for recommendations
- Maintain a constructive, solution-oriented tone

### What NOT to Do

- ❌ DO NOT read plan files yourself - let the subagents handle that
- ❌ DO NOT read implementation files directly - let the subagents handle that
- ❌ DO NOT perform verification yourself - delegate to phase-verifier subagents
- ❌ DO NOT spawn phase-verifiers sequentially - spawn them all in parallel
- ❌ DO NOT skip any phases

## Example Workflow

```
Step 1: Found feature 003-user-profiles with 3 phases
Step 2: Created verification directory
Step 3: Created master todo list with 3 phases
Step 4: Launching phase-verifiers in parallel...
  → Spawning phase-verifier for Phase 1
  → Spawning phase-verifier for Phase 2
  → Spawning phase-verifier for Phase 3
  → All verifiers launched, waiting for completion...
  → Phase 1 verification complete: PASS
  → Phase 2 verification complete: PASS WITH MINOR ISSUES
  → Phase 3 verification complete: PASS
Step 5: Reading all verification reports...
Step 6: Generating consolidated report...

Feature Verification Report: 003-user-profiles

[... detailed consolidated report ...]

Overall Verdict: PASS WITH MINOR ISSUES
```

Remember: You are the consolidator, not the verifier. Your job is to orchestrate the phase-verifier subagents, collect their reports, and synthesize a clear, actionable summary for the user.
