---
name: skill-creator
description: >-
  Create new skills from scratch, or port, adapt, and optimize existing skills
  (from Claude Code, OpenAI Codex, Cursor) to be 100% compatible with Google Antigravity IDE.
  Use when asked to "create a skill", "port a skill for Antigravity", "convert Claude skill to Antigravity",
  "audit skill compatibility", "adapt skill for Windows", or structure and validate skills under .agents/skills/.
---

# Skill Creator & Porter for Antigravity IDE

A comprehensive guide and toolkit for **creating new skills** and **modifying/porting existing skills** from the broader AI ecosystem (Claude Code, OpenAI Codex, Cursor) to Google Antigravity IDE.

---

## What is an Antigravity Skill?

In Antigravity IDE, skills are modular packages of procedures and knowledge that extend the agent's capabilities. 
Antigravity utilizes **Progressive Disclosure**:
1. **Startup (Metadata only)**: Only the `name` and `description` frontmatter fields are loaded into the agent's context.
2. **On-Demand Activation**: The full `SKILL.md` is loaded only when the user's prompt triggers the description.
3. **Bundled Resources**: Bulky manuals, API schemas, and reference docs are placed in `references/` and loaded only when referenced. Executable scripts live in `scripts/`.

### Directory Hierarchy in Antigravity
* **Workspace Skills (Project-Specific)**: `.agents/skills/<skill-name>/` (checked into Git)
* **Global Skills (User-Wide)**: `~/.gemini/config/skills/<skill-name>/`

Standard Folder Anatomy:
```text
.agents/skills/<skill-name>/
├── SKILL.md          # Required: Main instruction file with YAML frontmatter
├── scripts/          # Optional: Helper scripts (PowerShell .ps1, Node .js, or Python .py)
├── references/       # Optional: In-depth documentation loaded on-demand
├── examples/         # Optional: Sample workflows, reference inputs/outputs
└── resources/        # Optional: Static templates, assets, or data files
```

---

## Workflow 1: Porting Existing Skills (Claude / Codex → Antigravity)

Most existing open-source skills on GitHub were written for **Claude Code** or **Codex**. To make them work reliably in Antigravity IDE, follow this adaptation procedure:

### Step 1: Run the Automated Port Script
Run the built-in porting utility to automatically migrate the skill directory and translate standard tool syntax:

```bash
node .agents/skills/skill-creator/scripts/port_skill.js <source-path> [target-path]
```
*Example:*
```bash
node .agents/skills/skill-creator/scripts/port_skill.js ./downloaded-claude-skill .agents/skills/my-adapted-skill
```

### Step 2: Audit and Map Tool References
Claude and Codex rely on agent-specific tool names. Antigravity uses a different toolset. Convert any lingering tool mentions into tool-agnostic phrasing:

| Claude / Codex Tool | Antigravity IDE Equivalent | Recommended Phrasing |
| :--- | :--- | :--- |
| `Bash` / `Terminal` | `run_command` | `Run command: <cmd>` |
| `View` / `Read` | `view_file` | `Inspect file: <path>` |
| `Edit` / `Replace` | `replace_file_content` / `multi_replace_file_content` | `Edit file: <path>` |
| `Write` | `write_to_file` | `Create file: <path>` |
| `GlobTool` / `GrepTool` | `list_dir` / `grep_search` | `List directory / Search pattern` |
| `WebSearch` | `search_web` | `Search web for: <query>` |
| `WebFetch` | `read_url_content` / `browser_subagent` | `Fetch URL content` |

> [!TIP]
> Always instruct the model using neutral, procedural language (e.g. *"Inspect the configuration file at `src/config.json`"*) rather than naming a specific tool. This makes the skill resilient across model updates.

### Step 3: Windows & Cross-Platform Shell Adaptation
Claude skills almost universally assume Linux/macOS `bash` scripts (`#!/bin/bash`, `sed`, `awk`, `curl`, `jq`).
Because Antigravity frequently runs on **Windows (PowerShell)**:
1. **Never leave bash-only `.sh` scripts as the only automation.**
2. Convert `.sh` scripts into **Node.js (`.js`)** or **PowerShell (`.ps1`)**. Node.js is cross-platform and runs reliably in any environment where modern web dev tools exist.
3. Replace Unix-specific path separators (`/`) in commands with cross-platform Node or PowerShell paths.

### Step 4: Validate YAML Frontmatter
Ensure the `SKILL.md` frontmatter adheres to the Antigravity specification:
* `name`: Lowercase, alphanumeric, and hyphens only (`kebab-case`). No spaces or underscores.
* `description`: Clear, actionable, and between 50 and 1024 characters. **Do not use angle brackets (`<` or `>`)** as they can break YAML parsing.

Run the validator:
```bash
node .agents/skills/skill-creator/scripts/validate.js .agents/skills/<skill-name>
```

---

## Workflow 2: Creating a New Skill from Scratch

When authoring a new skill for Antigravity:

### Step 1: Capture Intent & Define Triggers
Ask:
1. **What specific workflow or domain does this solve?** (e.g., database migrations, Tailwind component refactoring, e2e testing).
2. **What user phrases should trigger this skill?** (e.g., *"When the user asks to run migrations, inspect database schemas, or optimize Postgres queries"*).
3. **What tools and outputs are expected?**

### Step 2: Write the `SKILL.md`
Draft the file using this template:

```markdown
---
name: my-specialized-workflow
description: >-
  Provide a detailed description of what the skill does AND when it should trigger.
  Antigravity relies on this description to know when to activate the skill.
---

# My Specialized Workflow

Briefly explain the goal and approach.

## Procedure

1. **Step 1: Preparation**
   Explain the steps clearly. Provide exact terminal commands to run:
   `npm test`
2. **Step 2: Execution**
   Guide the agent through decision-making and error-handling steps.
3. **Step 3: Verification**
   Always include verification steps so the agent can confirm success before concluding.

## Edge Cases & Troubleshooting
- List common gotchas and how the agent should handle them.
```

### Step 3: Organize Bulky Knowledge
* If documentation is long (>300 lines), do **not** put it in `SKILL.md`.
* Move it to `references/guide.md` and link to it: `[Detailed Guide](./references/guide.md)`.
* Antigravity will only read `references/guide.md` if the specific task requires it, preserving context window tokens.

---

## Workflow 3: Description Optimization for Accurate Triggering

Because Antigravity only sees the skill's `name` and `description` at startup, the `description` is your most critical leverage point.

### Guidelines for High-Accuracy Descriptions:
1. **Include Both Action & Context**: State what the skill does AND list trigger phrases.
2. **Be Appropriately Pushy**: Language models tend to undertrigger skills. Explicitly enumerate scenarios:
   - *Weak*: "Assists with Docker containers."
   - *Strong*: "Docker container and compose management. Use whenever the user asks to build, run, debug, or optimize Dockerfiles, docker-compose.yml files, container networks, or deployment images, even if Docker is mentioned casually."
3. **Avoid Over-Triggering**: If the skill is specific to a framework, mention what it should NOT trigger on (e.g., *"Do NOT trigger on general CSS tasks unrelated to Tailwind"*).

---

## Validation & Verification Checklist

Before finalizing any skill in Antigravity:

- [ ] Directory is placed in `.agents/skills/<skill-name>/` (or `~/.gemini/config/skills/<skill-name>/`).
- [ ] `SKILL.md` has valid YAML frontmatter with `name` and `description`.
- [ ] No Claude-specific tool names (`Bash`, `View`, `Edit`) remain in instructions.
- [ ] Scripts in `scripts/` can execute on Windows (PowerShell or Node.js).
- [ ] Reference links use clean Markdown relative paths (`./references/...`).
- [ ] `node .agents/skills/skill-creator/scripts/validate.js <path>` outputs `[PASS]`.
