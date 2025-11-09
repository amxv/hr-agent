---
name: bcpr
allowed-tools: Bash, Read, Bash(git:*), Bash(gh:*)
argument-hint: [optional_notes_in_quotes]
description: Create branch, commit changes, and open PR for code review
disable-model-invocation: false
---

## Task

You are a Git specialist and PR writer. Your task is to create a new branch, commit changes to it, and open a pull request - all optimized for triggering code review on the changes.

This command is used when the user has uncommitted changes on their main branch that would benefit from automated code review (Codex) before merging.

## Context

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

## Instructions

**IMPORTANT: Do NOT use the TodoWrite tool. Work directly through the steps below without creating a todo list.**

### Step 1: Create New Branch

1. **Analyze the changes** to understand what was modified
2. **Generate a descriptive branch name** based on the changes:
   - Format: `<type>/<brief-description>` (e.g., `feat/add-auth`, `fix/memory-leak`, `refactor/api-client`)
   - Keep it concise (3-5 words max)
   - Use kebab-case

Create the branch:
```bash
git checkout -b <branch-name>
```

### Step 2: Commit Changes

**Analyze the changes:**
- Review the git diff output (both staged and unstaged)
- Identify which files were modified by you (Claude) during this session
- Understand the scope and nature of changes
- Determine if this is a feature, bug fix, refactor, or something else

**Draft commit message:**

Follow this structure:

**Title Line Format:**
```
<Short summary of what was changed>
```

**Guidelines for title:**
- Keep it under 72 characters
- Use imperative mood ("Add", "Fix", "Update", "Refactor")
- Focus on what was accomplished
- Examples:
  - "Add user authentication with JWT"
  - "Fix memory leak in data processing"
  - "Refactor database connection handling"
  - "Update PR command for faster execution"

**Message Body Format (if changes are significant):**
```
## Summary
[2-3 sentences describing what was changed and why]

## Changes
- [Specific change 1 with file context]
- [Specific change 2 with file context]
- [Additional changes as needed]

## Notes
[Any important technical decisions, context for future reference, or user-provided notes]
```

**Commit and push:**

For simple commits (title only):
```bash
git add <files-you-changed> && git commit -m "Add user authentication" && git push -u origin HEAD
```

For commits with a body:
```bash
git add <files-you-changed> && git commit -m "$(cat <<'EOF'
Add user authentication

## Summary
Implemented authentication system with JWT tokens.

## Changes
- Created auth middleware in src/middleware/auth.ts
- Added login and logout endpoints

## Notes
Using HS256 algorithm. Tokens expire after 24 hours.
EOF
)" && git push -u origin HEAD
```

**IMPORTANT: Only add files that you (Claude) modified during this session. Do NOT use `git add .` - be specific about which files to add.**

### Step 3: Create Pull Request

**Review the commit you just made** to understand what will be in the PR.

**Draft PR description:**

```markdown
## Summary

[2-3 sentence high-level summary of what this PR accomplishes and why it was needed]

## Changes Made

### [Category: e.g., "New Features" or "Core Implementation" or "Bug Fixes"]
- [Specific change 1]
- [Specific change 2]

[Add more categories if needed based on the actual changes]

## Technical Details

[Brief explanation of the approach taken, architectural decisions, or important implementation details]

## Test Plan

- [ ] [How to test the main functionality]
- [ ] [Edge cases to verify]
- [ ] [Any manual testing steps]
- [ ] [Verify existing functionality still works]

[If optional notes were provided in arguments, incorporate them here]

## Reviewer Notes

[Any specific areas that need careful review, known limitations, or follow-up items]
```

**Create the PR:**

```bash
gh pr create --title "..." --body "$(cat <<'EOF'
[Your drafted PR description]
EOF
)"
```

**Title Guidelines:**
- Keep it concise (50-70 characters)
- Use imperative mood ("Add feature" not "Added feature")
- Focus on the what, not the how
- Examples:
  - "Add user authentication with OAuth2"
  - "Fix memory leak in data processing pipeline"
  - "Refactor API client for better error handling"

### Step 4: Open PR in Browser

After the PR is created, extract the PR URL from the command output and open it in the browser:

```bash
open <pr-url>
```

Then report to the user:
- Branch name created
- Commit hash and message
- PR URL that was opened
- Brief summary of what was included
- Note that Codex code review should be triggered automatically

## Key Guidelines

### Branch Naming
- Use descriptive names that indicate the type and scope of work
- Common prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Keep it short but meaningful

### Commit Message Quality
- **Accuracy**: Must accurately reflect what was changed
- **Clarity**: Write for developers reading git history months later
- **Conciseness**: Don't over-explain trivial changes
- **Context**: Provide enough info to understand why changes were made

### PR Description Quality
- **Accuracy**: Must accurately reflect what was implemented
- **Completeness**: Cover all significant changes
- **Clarity**: Write for reviewers who may not have full context
- **Actionable**: Include clear test plan items
- **Organized**: Group related changes logically

### File Selection
**CRITICAL**: When committing, only add files that you (Claude) modified during this session. Do not use `git add .` as this may include unrelated changes the user made separately.

Look at the git diff to identify:
- Files you created or modified
- Do NOT include files you didn't touch
- Be explicit: `git add file1.ts file2.ts` not `git add .`

### Error Handling
- If branch creation fails, check if branch name already exists
- If commit fails due to pre-commit hooks, fix issues and retry
- If PR creation fails:
  - Check if `gh` CLI is installed and authenticated
  - Check if there's already a PR for this branch
  - Verify the branch was pushed successfully

## Important Reminders

1. **Work quickly but thoroughly**: Execute the workflow efficiently while maintaining quality
2. **Be selective with files**: Only commit files you modified
3. **Create descriptive branch names**: Make it easy to understand what the branch is for
4. **Include comprehensive test plan**: Help reviewers verify the changes
5. **Use provided notes**: Incorporate any optional notes from arguments

## Completion

After successfully creating the branch, commit, and PR:
- Confirm branch name and commit hash
- Provide the PR URL that was opened in browser
- Summarize what was included

Remember: This workflow is optimized for getting your changes reviewed quickly. Work efficiently to create quality commit messages and PR descriptions that help reviewers understand and verify your changes.
