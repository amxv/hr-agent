---
name: changes
allowed-tools: Bash(git:*)
argument-hint: ""
description: Show all uncommitted changes (staged and unstaged) on current branch
model: haiku
disable-model-invocation: false
---

## Task

Show all uncommitted changes on the current branch in a clear, readable format. Display staged changes, unstaged changes, and untracked files.

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

## Instructions

Present the changes in the following format:

```
Branch: [branch-name]

## Summary
- X file(s) with staged changes
- Y file(s) with unstaged changes
- Z untracked file(s)

## Staged Changes

[If there are staged changes, show the full diff with proper formatting]
[Group by file with file paths as headers]

[If no staged changes: "No staged changes."]

## Unstaged Changes

[If there are unstaged changes, show the full diff with proper formatting]
[Group by file with file paths as headers]

[If no unstaged changes: "No unstaged changes."]

## Untracked Files

[List untracked files from git status]
- path/to/file1.ext
- path/to/file2.ext

[If no untracked files: "No untracked files."]
```

## Guidelines

- If there are no changes at all (clean working tree), simply say: "Working tree is clean."
- Use proper diff formatting with syntax highlighting
- Group changes by file with clear file path headers
- Clearly separate staged, unstaged, and untracked sections
- Keep the output organized and easy to scan
- Count files accurately for the summary
