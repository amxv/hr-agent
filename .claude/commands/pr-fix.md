---
name: pr-fix
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Bash(git:*), Bash(gh:*)
argument-hint: [optional_context_or_notes]
description: Address PR review comments by making changes, committing, and updating PR
disable-model-invocation: false
---

## Task

You are a PR iteration specialist. Your task is to quickly respond to code review feedback by reading review comments, implementing the requested changes, committing them, and updating the PR with a summary.

You have received some code review feedback on a pull request. Your task is to implement the requested changes, commit them, and update the PR with a summary.

## Context

<owner>
!`gh repo view --json owner | jq -r  '.owner.login'`
</owner>

<repo>
!`gh pr view --json headRepository | jq -r '.headRepository.name'`
</repo>

<current-branch>
!`git branch --show-current`
</current-branch>

<pr-details>
!`gh pr view --json number,title,body,url`
</pr-details>

<git-status>
!`git status`
</git-status>

<user-notes>
$ARGUMENTS
</user-notes>

## Instructions

**IMPORTANT: Do NOT use the TodoWrite tool. Work directly through the steps below without creating a todo list.**


### Step 1: Get Review Comments

Run this command to get review comments in a concise format, using the owner, repo, and pr number from the context above:
```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  | jq -r '.[] | "user: \(.user.login)\npath: \(.path)\nstart_line: \(.start_line)\nline: \(.line)\ndiff_hunk:\n\(.diff_hunk)\nbody:\n\(.body)\n---"'
```

  Format the comments as:

  ## Comments

  [For each comment thread:]
  - @author file.ts#line:
    ```diff
    [diff_hunk from the API response]
  quoted comment text

    [any replies indented]

  If there are no comments, return "No comments found."

  Remember:
  1. Only show the actual comments, no explanatory text
  2. Include both PR-level and code review comments
  3. Preserve the threading/nesting of comment replies
  4. Show the file and line number context for code review comments
  5. Use jq to parse the JSON responses from the GitHub API

### Step 2: Read and Understand Review Feedback

1. **Identify specific changes requested**:
   - Code suggestions from reviewers
   - Issues flagged by automated reviews (Codex, linters, etc.)
   - Questions or concerns raised
   - File-specific feedback
2. **Prioritize changes** by importance and clarity
3. **Note any ambiguous feedback** that might need clarification

If there are no review comments or the feedback is unclear, inform the user and ask for clarification.

### Step 3: Implement the Requested Changes

1. **Locate the files** that need changes based on review comments
2. **Make the changes** using Edit, Write, or other tools as needed:
   - Address each review comment methodically
   - Fix issues flagged by automated tools
   - Refactor code as suggested
   - Add missing tests or documentation
   - Improve code quality based on feedback

3. **Verify completeness**: Ensure all actionable review comments have been addressed

### Step 3: Commit the Changes

**Analyze what you changed:**
- Review which files you modified
- Understand the scope of the fixes
- Categorize the types of changes (bug fixes, refactoring, added tests, etc.)

**Draft commit message:**

Use a clear, focused commit message format:

**Title Line Format:**
```
Address PR review feedback
```

Or be more specific if addressing particular issues:
```
Fix memory leak identified in code review
```
```
Add missing error handling per review comments
```
```
Refactor authentication logic as requested
```

**Guidelines for title:**
- Keep it under 72 characters
- Use imperative mood
- Be specific if addressing a particular issue
- Default to "Address PR review feedback" if multiple unrelated changes

**Message Body Format:**
```
## Summary
[Brief description of what review feedback was addressed]

## Changes Made
- [Specific fix 1 - reference comment if relevant]
- [Specific fix 2 - reference comment if relevant]
- [Additional changes as needed]

## Notes
[Any important context, decisions made, or follow-up items]
```

**Commit and push:**

For simple fixes (title only):
```bash
git add <files-you-changed> && git commit -m "Address PR review feedback" && git push origin HEAD
```

For fixes with detailed body:
```bash
git add <files-you-changed> && git commit -m "$(cat <<'EOF'
Address PR review feedback

## Summary
Fixed memory leak and added error handling as identified in code review.

## Changes Made
- Fixed memory leak in data processing pipeline by properly disposing resources
- Added try-catch blocks with proper error logging in API handlers
- Added missing unit tests for edge cases

## Notes
All automated checks should now pass.
EOF
)" && git push origin HEAD
```

**IMPORTANT: Only add files that you modified in this session. Be specific about which files to add.**

### Step 4: Comment on PR with Summary

After pushing, add a comment to the PR summarizing what was fixed:

**Draft PR comment:**

Create a concise summary of changes:

```markdown
### Review feedback addressed

✓ [Specific issue 1 fixed]
✓ [Specific issue 2 fixed]
✓ [Specific issue 3 fixed]

[Brief explanation of approach or any relevant context]

All changes have been pushed. Ready for re-review.
```

**Post the comment:**

```bash
gh pr comment --body "$(cat <<'EOF'
### Review feedback addressed

✓ Fixed memory leak in data processing by disposing resources properly
✓ Added error handling with try-catch blocks and logging
✓ Added unit tests for edge cases

All automated checks should now pass. Ready for re-review.
EOF
)"
```

**Then report to the user:**
- Commit hash and message
- List of files changed
- Summary of what was fixed
- PR URL for reference
- Confirmation that comment was posted

## Key Guidelines

### Understanding Review Feedback

- **Read carefully**: Make sure you understand what's being requested
- **Ask if unclear**: If feedback is ambiguous, ask the user for clarification before proceeding
- **Check for patterns**: Multiple comments about the same issue might indicate a systemic problem
- **Prioritize**: Address critical issues (bugs, security) before style issues

### Making Changes

- **Be thorough**: Address all actionable feedback, not just the easy stuff
- **Maintain quality**: Don't sacrifice code quality to address feedback quickly
- **Test your changes**: Make sure fixes don't introduce new issues
- **Stay focused**: Only change what's needed to address the feedback

### Commit Message Quality

- **Be specific**: "Fix memory leak" is better than "Address feedback"
- **Reference context**: Mention what review comment you're addressing if relevant
- **Group related changes**: If fixing multiple related issues, explain the relationship
- **Keep it concise**: Don't over-explain simple fixes

### PR Comment Quality

- **Use checkmarks**: Visual indicators (✓) make it easy to scan what was done
- **Be specific**: Reference the actual issues you fixed
- **Provide context**: Briefly explain your approach if it's not obvious
- **Signal readiness**: Let reviewers know it's ready for re-review
- **Be professional**: Thank reviewers if appropriate

### Error Handling

- If `gh pr view` fails:
  - Check that you're on a branch with an open PR
  - Verify `gh` CLI is authenticated
  - Confirm PR exists for this branch

- If no review comments found:
  - Ask user to clarify what needs to be fixed
  - Check if they meant a different PR

- If commit/push fails:
  - Check for merge conflicts
  - Verify you have push permissions
  - Check for pre-commit hook failures

- If PR comment fails:
  - Verify PR is still open
  - Check authentication
  - Provide the comment text to user so they can post manually

## Important Reminders

1. **Work quickly but carefully**: Speed is important, but don't sacrifice correctness
2. **Address all feedback**: Don't cherry-pick only the easy comments
3. **Communicate clearly**: Your PR comment helps reviewers know what changed
4. **Only commit what you changed**: Be selective with `git add`
5. **Use provided notes**: Incorporate any context from arguments

## Edge Cases

### Multiple Reviewers with Conflicting Feedback

If reviewers disagree on an approach:
- Ask the user which direction to take
- Or implement the most senior reviewer's suggestion
- Document the decision in your commit message

### Review Asks for Clarification, Not Changes

If a reviewer asks a question rather than requesting a change:
- Don't make code changes
- Draft a thoughtful response
- Post as PR comment
- Inform the user

### No Review Comments Found

If there are no comments but user says there's feedback:
- The feedback might be in a different format (inline suggestions, linked issues)
- Ask user to specify what needs to be fixed
- Or check if they're looking at a different PR

### Large Refactoring Requested

If review asks for significant architectural changes:
- Confirm with user before proceeding
- Consider if this should be a separate PR
- Document the scope of changes clearly

## Completion

After successfully implementing fixes and updating the PR:
- Confirm commit was pushed successfully
- Show commit hash and summary
- Confirm PR comment was posted
- List what was fixed in a scannable format
- Provide PR URL for reference

Remember: This workflow is about rapid iteration on code review feedback. Work efficiently to address feedback thoroughly, then clearly communicate what you fixed to help reviewers quickly re-review your changes.
