# Implementing "Everything Claude Code" in Your Repos: A Complete Walkthrough

Based on [Affaan Mustafa's Everything Claude Code](https://github.com/affaan-m/everything-claude-code) — the open-source config collection from the Anthropic hackathon winner that hit 900K+ views on X.

---

### Step 3: Create Your CLAUDE.md

`CLAUDE.md` is Claude Code's persistent memory — it loads automatically every session. Navigate to your project root and run:

```bash
claude

> /init
```

This makes Claude analyze your codebase and generate a `CLAUDE.md`. Then refine it to include:

```markdown
# Project Name

## Quick Facts
- **Stack**: [your tech stack]
- **Build Command**: `npm run build`
- **Test Command**: `npm run test`
- **Lint Command**: `npm run lint`

## Key Directories
- `src/components/` - React components
- `src/api/` - API routes
- `tests/` - Test files

## Code Conventions
- TypeScript strict mode
- Prefer interfaces over types
- No `any` — use `unknown`
- Functional components with hooks

## Architecture Decisions
- [Any patterns, state management choices, etc.]
```

`CLAUDE.md` files are hierarchical — you can have one at the project root and more in nested directories. Claude reads them all and prioritizes the most specific one when relevant.

### Step 4: Set Up Rules

Rules are always-follow guidelines. Copy the ones you need from the plugin, or create your own in `.claude/rules/`:

```
.claude/rules/
├── security.md        # Mandatory security checks
├── coding-style.md    # Immutability, file organization
├── testing.md         # TDD, 80% coverage requirement
├── git-workflow.md    # Commit format, PR process
└── agents.md          # When to delegate to subagents
```

Rules differ from skills: rules are **always active**, skills are **triggered on demand**.

### Step 5: Configure Settings

Create `.claude/settings.json` in your project root for project-specific settings (hooks, permissions, environment):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "[ \"$(git branch --show-current)\" != \"main\" ] || { echo '{\"block\": true, \"message\": \"Cannot edit on main branch\"}' >&2; exit 2; }",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

This example blocks edits on the `main` branch — a safety net against accidental production changes.

---

## Phase 2: Building (Day-to-Day Development)

### Using Slash Commands

With the ECC plugin installed, you get a full toolkit of commands:

| Command | What It Does |
|---------|--------------|
| `/plan` | Have Claude create an implementation plan before coding |
| `/tdd` | Test-driven development workflow |
| `/e2e` | Generate Playwright end-to-end tests |
| `/code-review` | Run a quality and security review |
| `/build-fix` | Fix build errors automatically |
| `/refactor-clean` | Remove dead code and loose files |
| `/checkpoint` | Save verification state |
| `/verify` | Run the verification loop |
| `/learn` | Extract patterns mid-session into reusable skills |

Chain them together in a single prompt:

```
/plan implement user authentication with OAuth
```

Then after implementation:

```
/tdd
/code-review
```

### Delegating to Subagents

Subagents are specialized processes your main Claude session can delegate to. The ECC plugin includes:

- **planner** — Feature implementation planning
- **architect** — System design decisions
- **tdd-guide** — Test-driven development
- **code-reviewer** — Quality and security review
- **security-reviewer** — Vulnerability analysis
- **build-error-resolver** — Fix build failures
- **e2e-runner** — Playwright E2E testing
- **refactor-cleaner** — Dead code cleanup

Ask Claude to delegate explicitly:

```
Use the architect agent to evaluate whether we should use a monorepo or polyrepo for this project.
```

Subagents run with limited scope and tool permissions, freeing up context for your main session.

### Managing MCPs (Model Context Protocol)

MCPs connect Claude to external services. The ECC plugin includes configs for GitHub, Supabase, Vercel, Railway, and more in `mcp-configs/`.

**Key rule from Affaan:** Be picky with MCPs. Have 20–30 in your config, but keep under 10 enabled and under 80 tools active. Too many tools eat into your 200K context window — you might only get 70K of usable context with everything loaded.

Check your current MCP status:

```
/plugins
# scroll down to see MCPs, or
/mcp
```

### Hooks for Automation

Hooks run automatically at specific lifecycle points. The ECC plugin includes hooks for:

- **Session start** — Load saved context
- **Session end** — Save state automatically
- **Pre-compact** — Save state before compaction
- **Strategic compact** — Suggest when to compact

You can add your own hooks for auto-formatting, running tests on file changes, or type-checking after edits.

### Context Management

This is where most people lose efficiency. Key practices:

1. **Use `/compact` strategically** — Don't wait until you hit the context limit. Compact when you finish a logical unit of work.

2. **Use contexts for mode switching** — The ECC plugin includes context files in `contexts/`:
   - `dev.md` — Development mode
   - `review.md` — Code review mode
   - `research.md` — Research/exploration mode

3. **Model selection matters** — Use Opus 4.5/4.6 for complex architecture and planning, Sonnet 4.5 for implementation and execution. The `/model` command lets you switch mid-session.

### Continuous Learning

After a productive session, run:

```
/learn
```

This extracts patterns from the session into reusable skills. Over time, Claude learns your codebase's idioms and preferences.

For the v2 system with confidence scoring:

```
/skill-create              # Generate skills from git history
/skill-create --instincts  # Also generate instincts
/instinct-status           # View learned instincts with confidence
/instinct-export           # Share instincts with teammates
/evolve                    # Cluster related instincts into skills
```

---

## Phase 3: Scaling (Multi-Agent & Parallel Workflows)

### Git Worktrees for Parallel Claude Sessions

When you need multiple Claude instances working simultaneously without conflicts:

```bash
# Create worktrees for parallel work
git worktree add ../project-auth feature/auth
git worktree add ../project-payment feature/payment

# Run Claude in each
cd ../project-auth && claude
cd ../project-payment && claude
```

Each worktree is an independent checkout — no conflicts between sessions.

### Multi-Agent Orchestration with PM2

The ECC plugin includes commands for complex multi-service workflows:

```
/pm2              # Process management
/multi-plan       # Plan across multiple agents
/multi-execute    # Execute across agents
/multi-backend    # Backend-focused multi-agent
/multi-frontend   # Frontend-focused multi-agent
/multi-workflow   # Full workflow orchestration
```

### tmux for Monitoring

Use tmux to stream and watch logs from processes Claude spins up:

```bash
# Claude starts a dev server — attach to watch logs
tmux attach -t claude-session
```

---

## Quick Reference: File Structure

Here's what a fully configured repo looks like:

```
your-project/
├── CLAUDE.md                    # Project memory (auto-loaded)
├── .claude/
│   ├── settings.json            # Hooks, permissions, environment
│   ├── rules/                   # Always-active guidelines
│   │   ├── security.md
│   │   ├── coding-style.md
│   │   └── testing.md
│   ├── commands/                # Custom slash commands
│   │   └── deploy.md
│   └── skills/                  # On-demand workflow definitions
│       └── my-custom-skill/
│           └── SKILL.md
├── src/
└── ...
```

Plus the ECC plugin provides its agents, skills, and hooks globally.

---

## TL;DR — The Minimum Viable Setup

If you want to get going fast with just the essentials:

1. `npm install -g @anthropic-ai/claude-code`
2. `cd your-project && claude`
3. `/init` (generates CLAUDE.md)
4. `/plugin marketplace add affaan-m/everything-claude-code`
5. `/plugin install everything-claude-code@everything-claude-code`
6. Start building — use `/plan` before features, `/tdd` for testing, `/code-review` before merging.

Everything else layers on top as your needs grow.

---

*Sources: [Everything Claude Code repo](https://github.com/affaan-m/everything-claude-code) · [Affaan's Shorthand Guide](https://x.com/affaanmustafa/status/2012378465664745795) · [Affaan's Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) · [Anthropic Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code/overview)*
