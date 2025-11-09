---
name: start-dev-server
allowed-tools: Bash(bun:*), Bash(pnpm:*), Bash(npm:*), Bash(yarn:*)
argument-hint: "[additional context]"
description: Start the development server for the project
model: haiku
disable-model-invocation: false
---

Run the bash command `bun dev` in the background and check the logs using the `BashOutput` tool to make sure it started successfully.

(use pnpm, npm, or yarn instead of bun if specified)

NOTE: If the command shows /dev is running... that does NOT mean the dev server is running. It means that YOU have been assigned the task of starting the dev server in the background, so run the `bun dev` command and check the status.