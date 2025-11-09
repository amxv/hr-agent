---
name: merge
allowed-tools: Bash, Bash(gh:*), Bash(git:*)
argument-hint: [pr_number]
description: Quickly merge pull request into default branch
disable-model-invocation: true
---

## Task

You are a pull request merge specialist. Your task is to quickly merge a pull request into the default branch (main or master).

This command is typically run when I'm confident a PR is ready to merge.

## Context

<user-notes>
$ARGUMENTS
</user-notes>

## Instructions

**IMPORTANT: Do NOT use the TodoWrite tool. Work directly through the steps below without creating a todo list.**

### Step 1: Merge the PR

If a PR number was provided in the arguments, use it to merge the PR.

If a PR number was NOT provided in the arguments, read the conversation context before this command to find the PR number.

If no PR number exists in the context, check if current branch has an open PR:

```bash
gh pr view --json number -q .number
```

Then merge using:

```bash
gh pr merge <pr_number> --merge
```

This will merge the PR using a merge commit (preserves all commits).

**Alternative merge strategies** (if user specifies in arguments):
- `--squash`: Squash all commits into one
- `--rebase`: Rebase commits onto base branch

### Step 2: Switch to default branch and pull

After successful merge, switch to main and pull latest:

```bash
git checkout main && git pull origin main
```

If the default branch is not `main`, try `master`:

```bash
git checkout master && git pull origin master
```

## Error Handling

If `gh pr merge` fails:
- The PR might have merge conflicts
- CI/CD checks might be required but failing
- The user might not have permission to merge
- The PR might already be merged or closed
- Report the error to the user and suggest they check the PR status with `gh pr view <pr_number>`

If switching to default branch fails:
- Report which branch names were tried
- Ask user to manually switch and pull

## Completion

After successfully merging:
- Confirm the PR number that was merged
- Confirm you're now on the default branch with latest changes
- Report any relevant output from the merge