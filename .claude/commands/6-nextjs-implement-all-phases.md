---
name: nextjs-implement-all-phases
allowed-tools: Read, Bash(ls:*), Bash(grep:*), Bash(git:*), Task, TodoWrite
argument-hint: [feature_id] [optional_notes_in_quotes]
description: Implement all phases of a feature sequentially using phase-implementer subagents.
disable-model-invocation: true
---

The current time is !`date "+%Y-%m-%d %H:%M:%S"`

## Task

You are orchestrating the complete implementation of a feature by orchestrating multiple phase-implementer subagents in sequence. Your role is to ensure each phase is implemented sequentially and successfully before moving to the next phase to complete the feature.

IMPORTANT: DO NOT run `phase-implementer` subagents in parallel. Each phase must be implemented sequentially and successfully before moving to the next phase.

<details>
$ARGUMENTS
</details>

## Steps

### Step 1: Gather Context and Validate Feature

In the details above, you will find the feature id.

1. Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.

   If the feature doesn't exist, immediately tell me that the feature doesn't exist and I should run the appropriate commands to create it first.

2. Read the feature summary document to understand:
   - The feature overview
   - The complete list of phases
   - The scope of work

   Read: `gg/features/<feature-slug>/summary.md`

3. Parse the "Phase List" section to determine the total number of phases (e.g., Phase 1, Phase 2, Phase 3, etc.)

### Step 2: Create Master Todo List

Using the TodoWrite tool, create a high-level todo list with one item per phase:

```
- [ ] Implement Phase 1: [Phase Name]
- [ ] Implement Phase 2: [Phase Name]
- [ ] Implement Phase 3: [Phase Name]
...
```

Mark all phases as `pending` initially.

### Step 3: Sequential Phase Implementation

For each phase (starting from Phase 1), follow this complete workflow:

#### 3.1 Before Starting a Phase:
1. Mark the current phase as `in_progress` in your master todo list
2. Announce which phase you're starting

#### 3.2 Implement the Phase:
Use the Task tool to spawn a `phase-implementer` subagent with a prompt like:

```
Implement Phase {phase-number} of feature {feature-id}.

Feature ID: {feature-id}
Feature Slug: {feature-slug}
Phase Number: {phase-number}

Please implement all changes described in the phase plan following the systematic process:
1. Read all required documents
2. Set up the task todo list
3. Implement all changes incrementally
4. Complete the implementation and report back

{optional_notes_if_any}
```

Wait for the phase-implementer to complete.

#### 3.3 Fix TypeScript/Lint Errors:
After the phase-implementer completes, use the Task tool to spawn a `phase-error-fixer` subagent:

```
The implementation of Phase {phase-number} of feature {feature-id} is complete.
Please check if there are any TypeScript and lint errors and fix them systematically.

Feature ID: {feature-id}
Feature Slug: {feature-slug}
Phase Number: {phase-number}
```

Wait for the phase-error-fixer to report that all errors have been fixed. Only proceed to the next phase if all errors have been fixed, otherwise spawn a new `phase-error-fixer` subagent to fix the remaining errors.

IMPORTANT: You must spawn a `phase-error-fixer` subagent for every phase after the phase-implementer completes its implementation. Do not skip this step.

#### 3.4 Commit and Push Changes:
After the phase is fully implemented and all errors are fixed:

1. Run this single git command to stage, commit, and push:

   ```bash
   git add . && git commit -m "$(cat <<'EOF'
   {feature-id}.{phase-number} [Short summary of what was implemented]
   EOF
   )" && git push origin HEAD
   ```

   If the push fails because there's no upstream tracking:
   ```bash
   git push -u origin HEAD
   ```

2. Confirm the commit was successful and changes are pushed

#### 3.5 Mark Phase Complete:
1. Mark the phase as `completed` in your master todo list
2. Provide a brief status update to the user

#### 3.6 Repeat for each remaining phase:
If there are more phases remaining, follow the steps from 3.1 to 3.5 for each of the remaining phases.

#### CRITICAL: Sequential Execution Only
- **NEVER spawn multiple subagents in parallel**
- **ALWAYS wait for the current phase to fully complete (implement → fix errors → commit) before starting the next phase**
- Each phase builds on the previous phase, so order matters
- Each phase must be error-free and committed before moving to the next

### Step 4: Final Summary

After all phases are complete, provide a comprehensive summary:

```markdown
## Feature Implementation Complete: {feature-slug}

### Phases Implemented:
- ✅ Phase 1: [Phase Name] - [Brief status]
- ✅ Phase 2: [Phase Name] - [Brief status]
- ✅ Phase 3: [Phase Name] - [Brief status]
...

### Overall Status:
- Total Phases: {N}
- Completed: {N}
- Failed: {0}

### Key Accomplishments:
[Brief summary of what was implemented across all phases]

### Verification Status:
- Type Safety: [✅/❌]
- Linting: [✅/❌]
- Build: [✅/❌]

### Next Steps:
[Recommendations for testing, review, or deployment]

### Issues Encountered:
[List any issues that were encountered and resolved, or any outstanding concerns]
```

## Important Guidelines

### Orchestration Principles

1. **Sequential Execution is Critical**: Each phase must complete successfully (implement → fix errors → commit) before starting the next. This ensures:
   - Dependencies between phases are respected
   - Issues are caught early and don't cascade
   - Each phase is committed and can be rolled back independently

2. **Progress Tracking**: Use the master todo list to give the user clear visibility into:
   - Which phase is currently being implemented
   - Which phases have been completed
   - Which phases are pending
   - Current step within each phase (implement/fix/commit)

3. **Quality Gates**: Each phase must pass all checks before committing and moving to the next phase:
   - All implementation tasks completed
   - Type checking passes
   - Linting passes
   - Build succeeds
   - Changes committed and pushed

### Communication Guidelines

- Be clear and concise in your status updates
- Report progress after each phase completes
- Highlight any deviations or issues immediately
- Provide actionable next steps in your final summary

### What NOT to Do

- ❌ DO NOT read plan files yourself - let the subagents handle that
- ❌ DO NOT spawn any subagents in parallel
- ❌ DO NOT skip phases or implement them out of order
- ❌ DO NOT proceed to next phase without fixing all errors first
- ❌ DO NOT proceed to next phase without committing current phase first
- ❌ DO NOT modify implementation plans yourself - let the subagents handle that
- ❌ DO NOT implement code changes directly - delegate to phase-implementer subagents
- ❌ DO NOT fix errors directly - delegate to phase-error-fixer subagents

## Example Workflow

```
Step 1: Found feature 003-user-profiles with 3 phases
Step 2: Created master todo list with 3 phases
Step 3: Starting Phase 1...
  → Spawning phase-implementer for Phase 1
  → Phase 1 implementation complete
  → Spawning phase-error-fixer for Phase 1
  → All errors fixed
  → Committing Phase 1 changes (003.1 Add database schema and types)
  → Commit pushed successfully
  → Phase 1 complete
  → Starting Phase 2...
  → Spawning phase-implementer for Phase 2
  → Phase 2 implementation complete
  → Spawning phase-error-fixer for Phase 2
  → All errors fixed
  → Committing Phase 2 changes (003.2 Implement server actions)
  → Commit pushed successfully
  → Phase 2 complete
  → Starting Phase 3...
  → Spawning phase-implementer for Phase 3
  → Phase 3 implementation complete
  → Spawning phase-error-fixer for Phase 3
  → All errors fixed
  → Committing Phase 3 changes (003.3 Create UI components)
  → Commit pushed successfully
  → Phase 3 complete
Step 4: All phases complete! Feature ready for testing.
```

Remember: You are the conductor, not the performer. Your job is to orchestrate the phase-implementer and phase-error-fixer subagents, handle commits between phases, ensure everything completes successfully in order, and provide clear status updates throughout the process.
