---
name: 12-merge
allowed-tools: Bash, Bash(gh:*), Bash(git:*)
argument-hint: [pr_number]
description: Merge pull request into default branch
disable-model-invocation: true
---

## Task

You are a pull request merge specialist. Your task is to quickly and safely merge a pull request into the default branch (main or master).

This command is typically run after reviewing a PR created by the `/11-pr` command.

## Initial Validation

Before proceeding, verify:
1. You have a PR number argument
2. The PR exists and is open
3. The PR has no merge conflicts

If the PR number is missing, ask the user to provide it: `/12-merge <pr_number>`

## Instructions

### Step 1: Validate PR Number

Ensure the PR number was provided as an argument. If not, ask the user to provide it.

### Step 2: Check PR Status

Use the GitHub CLI to check the PR status:

```bash
gh pr view <pr_number>
```

This will show:
- PR title and description
- Current status (open/closed/merged)
- Merge conflicts (if any)
- CI/CD check status

### Step 3: Merge the PR

If the PR is ready to merge (open, no conflicts, checks passing), merge it using:

```bash
gh pr merge <pr_number> --merge
```

This will:
- Merge the PR using a merge commit (preserves all commits)

**Alternative merge strategies** (if user requests):
- `--squash`: Squash all commits into one
- `--rebase`: Rebase commits onto base branch

### Step 4: Switch to default branch and pull latest changes

Switch to the default branch using:

```bash
git checkout <default_branch>
```

Then pull the latest changes from the default branch using:

```bash
git pull origin <default_branch>
```

This will ensure the user is on the latest version of the code.

## Key Guidelines

### Safety Checks

- **Always check PR status first** before attempting to merge
- **Verify no merge conflicts** exist
- **Check CI/CD status** - warn user if checks are failing

### Error Handling

If `gh pr view` fails:
- Verify the PR number is correct
- Check if the PR exists: `gh pr list --state all`

If `gh pr merge` fails, check if:
- The PR has merge conflicts that need resolution
- CI/CD checks are required but failing
- The user has permission to merge
- The PR is already merged or closed

### Best Practices

1. **Quick verification**: Always view the PR details before merging
2. **Default to merge commits**: Use `--merge` to preserve commit history unless user specifies otherwise
3. **Communicate clearly**: Show the user what PR is being merged before proceeding

## Important Reminders

1. **Check PR first**: Always view the PR before merging to catch issues
2. **Respect CI/CD**: If checks are failing, warn the user before merging
3. **Confirm success**: Verify the merge completed successfully before marking complete

## Completion

After successfully merging the PR:
- Confirm the PR number that was merged
- Let the user know the changes are now in the default branch

Remember: Quick and safe merges help maintain a clean git history and efficient workflow.
