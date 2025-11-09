---
description: Create a new shell command, function, or script and add it to ZSHRC
argument-hint: [description of shell command/function/alias you want]
disable-model-invocation: false
---

Your task is to create a new shell command, function, alias, or script based on the following instructions:

<description>
$ARGUMENTS
</description>

If no description is provided, respond with: "Please provide a description: /new-shell-cmd `<description>`"

## Guidelines:

1. **Analyze the request** to determine the best approach:
   - Simple one-liners → Create a shell alias or simple function
   - Multi-step logic or complex operations → Create a Bash function
   - Requires data processing, API calls, or complex logic → Create a Python script

2. **For scripts (Bash or Python)**:
   - Create the script in `~/code/amxv/scripts/`
   - Make it executable with `chmod +x`
   - Add a clear shebang line (`#!/bin/bash` or `#!/usr/bin/env python3`)
   - Include helpful comments
   - Add error handling where appropriate

3. **Update ZSHRC** (`~/.zshrc`):
   - Read the current .zshrc file first
   - For aliases: Add `alias name='command'`
   - For functions: Add the complete function definition
   - For scripts: Add an alias that calls the script (e.g., `alias cmdname='~/code/amxv/scripts/script_name.sh'`)
   - Place additions in a logical section (create a "# Custom Commands" section if it doesn't exist)

4. **After updating**:
   - Show the user what was added to .zshrc
   - Explain how to use the new command
   - Remind user to run `source ~/.zshrc` or start a new terminal session

5. **Naming conventions**:
   - Use lowercase with underscores for script files
   - Use concise, memorable names for aliases/functions
   - Avoid conflicts with existing commands (check first if possible)

Now, please implement the requested shell command based on the instructions above.
