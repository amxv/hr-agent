---
name: commit-phase
allowed-tools: Bash, Read, Bash(gg ctx:*), Bash(git:*)
argument-hint: [feature_id].[phase_number] [optional_notes_in_quotes]
description: Commit phase implementation changes with comprehensive context-aware message
disable-model-invocation: true
model: haiku
---

## Task

You are a Git commit specialist and technical writer. You are an expert at creating clear, comprehensive commit messages that accurately summarize implementation work and communicate changes effectively.

This command is typically run after completing the implementation of a single phase in a feature (after `/6-implement-phase`). Your task is to commit all unstaged changes in the current branch with a well-structured commit message that accurately reflects the phase implementation.

## Context

<details>
$ARGUMENTS
</details>

### Step 1: Gather Context

In the details above, you will find the feature id and phase number (in a format like <feature-id>.<phase-number> or in natural language).

Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.

I've prepared four documents that you should read fully in parallel:

1. **Feature Specification**: A detailed specification of the feature, including user scenarios, functional requirements, key entities, and other relevant information at `gg/features/<feature-slug>/{feature-id}-SPEC.md`

2. Feature Summary: A summary of the feature at `gg/features/<feature-slug>/summary.md`

3. **Phase-Specific Implementation Plan**: A detailed, low-level implementation guide for this specific phase, including exact code changes, file modifications at `gg/features/<feature-slug>/plans/{feature-id}.{phase-number}.md`

4. Task List: A comprehensive task list for this phase at `gg/features/<feature-slug>/plans/{feature-id}.{phase-number}-TASKS.md`

Read the phase implementation plan carefully and understand:

- **Overview**: What this phase accomplishes
- **Important Codebase Context**: Files to understand, modify, or create
- **Changes Required**: Detailed technical description of all changes

<current-branch>
!`git branch --show-current`
</current-branch>

<git-status>
!`git status`
</git-status>

<staged-changes>
!`git diff --cached`
</staged-changes>

<unstaged-changes>
!`git diff`
</unstaged-changes>

<user-notes>
$ARGUMENTS
</user-notes>

## Initial Validation

Before proceeding, verify:
1. You have both feature_id and phase_number arguments (format: `feature_id.phase_number`)
2. You are on a feature branch (not main/master)
3. There are actual changes to commit (staged or unstaged)

If the feature_id.phase_number is missing, ask the user to provide it: `/9-commit-phase <feature_id>.<phase_number>`

If there are no changes to commit, inform the user that the working directory is clean.

## Instructions

### Step 1: Gather Implementation Context

1. **Read the phase plan** (provided above via `gg ctx --fullphase`):
   - Understand what this phase was supposed to accomplish
   - Review the list of changes that were planned
   - Note the files that were supposed to be modified/created

2. **Review actual changes made**:
   - Analyze the git diff output (both staged and unstaged)
   - Identify which files were actually modified/created
   - Understand the scope of changes in each file

3. **Compare planned vs actual**:
   - Do the actual changes align with the phase plan?
   - Were there any additional changes beyond the plan?
   - Were there any deviations from the planned approach?

### Step 2: Draft Commit Message

Create a commit message with the following structure:

**Title Line Format:**
```
<feature_id>.<phase_number> <Short summary of what was implemented>
```

**Guidelines for title:**
- Keep it under 72 characters
- Use imperative mood ("Add", "Implement", "Update", not "Added", "Implemented", "Updated")
- Focus on what was accomplished, not how
- Example: `001.1 Add user authentication models and types`

**Message Body Format:**
```
## Phase Overview
[2-3 sentences describing what this phase accomplishes in the context of the feature]

## Changes Made

### [Category 1 - e.g., Database Schema]
- [Specific change 1]
- [Specific change 2]

### [Category 2 - e.g., Types & Interfaces]
- [Specific change 1]
- [Specific change 2]

### [Category 3 - e.g., Server Actions]
- [Specific change 1]

[Additional categories as needed]

## Implementation Notes
[Any important technical decisions, deviations from plan, or context for future reference]

[If optional notes were provided in arguments, include them here]
```

**Guidelines for body:**
- Organize changes by logical categories (Database, Types, Components, Server Actions, etc.)
- Be specific about what was added/modified/removed
- Include file paths for major changes
- Mention any deviations from the original plan
- Note any follow-up work needed
- Keep each bullet point concise but informative
- If optional notes were provided in arguments, include them in Implementation Notes section

### Step 3: Stage, Commit, and Push

Execute the following in a single command chain to stage all changes, create the commit, and push to origin:

```bash
git add . && git commit -m "$(cat <<'EOF'
<feature_id>.<phase_number> <Short summary>

## Phase Overview
[Overview text]

## Changes Made

### [Category 1]
- [Change 1]
- [Change 2]

### [Category 2]
- [Change 1]

## Implementation Notes
[Notes]
EOF
)" && git push origin HEAD
```

If the push fails because there's no upstream tracking, use:
```bash
git add . && git commit -m "..." && git push -u origin HEAD
```

## Key Guidelines

### Commit Message Quality Standards

- **Accuracy**: The commit message must accurately reflect what was implemented
- **Completeness**: Include all significant changes, organized by category
- **Clarity**: Write for developers who will read this in git history months later
- **Context**: Provide enough information to understand why changes were made
- **Searchability**: Use clear technical terms that can be easily searched

### Commit Title Guidelines

- Format: `<feature_id>.<phase_number> <imperative summary>`
- Under 72 characters total
- No period at the end
- Focus on the "what" at a high level
- Examples:
  - `001.1 Add database schema and shared types`
  - `002.2 Implement authentication server actions`
  - `003.3 Create user profile UI components`

### What to Include in Commit Body

**DO include:**
- High-level overview of the phase
- Organized list of changes by category
- Key technical decisions made
- Deviations from the original plan
- Important implementation notes
- File paths for significant changes

**DON'T include:**
- Line-by-line code changes (git diff handles this)
- Overly verbose descriptions
- Implementation details better suited for code comments
- Future work (save for issue tracker)

### Error Handling

- If `git add` fails, check for merge conflicts or file permission issues
- If `git commit` fails due to pre-commit hooks:
  - Review the hook output
  - Fix any issues raised by hooks
  - Re-run the commit
  - If hook modifies files, check authorship before amending
- If `git push` fails:
  - Check if remote is ahead (need to pull first)
  - Check for network issues
  - Check if branch protection rules are blocking the push
  - If force push is needed, warn user and ask for confirmation
- If no changes to commit, inform user that working directory is clean
- If on wrong branch, warn user before proceeding

## Important Reminders

1. **Read the phase plan**: Always understand what the phase was meant to accomplish
2. **Review all changes**: Look at both staged and unstaged changes completely
3. **Organize logically**: Group changes by type (Database, Types, Components, etc.)
4. **Be thorough**: Include all significant changes in the commit message
5. **Use provided notes**: If the user provided optional notes, incorporate them in Implementation Notes
6. **Follow format exactly**: Use the specified title format with feature_id.phase_number prefix
7. **Don't commit secrets**: Always check for sensitive files before committing

## Edge Cases

### Multiple Commits Already Made

If the user has already made commits during implementation:
- Ask if they want to create an additional commit for remaining changes
- Or if they want to amend the last commit (check authorship first)

### No Unstaged Changes

If all changes are already staged:
- Proceed with creating the commit
- Note in your response that changes were already staged

### Uncommitted Changes from Previous Phase

If there are changes that don't match the current phase:
- Ask the user to clarify which changes belong to this phase
- Suggest using `git add -p` for selective staging if needed

## Completion

After successfully creating the commit and pushing:
- Provide the commit hash and title
- Show a summary of what was committed (X files changed, Y insertions, Z deletions)
- Confirm all phase implementation work is now committed and pushed to origin

Remember: A good commit message serves as documentation for the project's history. It should help future developers (including yourself) understand what was done and why, without needing to read the full diff.
