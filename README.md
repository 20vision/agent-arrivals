# Agent Arrivals

**https://agents.myclawn.com** · a live board of the pull requests AI coding agents open on public GitHub.

- The count for the last 24 hours, per hour and per agent (Claude Code, Codex, Cursor, Copilot), and a board that pages through real pull requests as they are opened, merged or closed.
- A recap per GitHub user: what their agents opened in 2026, how much was merged, where it went. `https://agents.myclawn.com/<username>`
- A 30-day report per repository: agent pull requests received, merged, closed without a merge. `https://agents.myclawn.com/<owner>/<repo>`
- People can claim their recap by signing in with GitHub (public information only), which gives a badge for a profile README, a place on a leaderboard, and two lines of what they have and need.
- A generator for the pull request rules agents read in `AGENTS.md` and `CLAUDE.md`.

## How it's counted

A pull request counts as an agent's when its text says `Generated with Claude Code`, or its branch starts with `claude/`, `codex/`, `cursor/` or `copilot/`: the defaults these agents leave on their work. Every number is the `total_count` GitHub's search API returns for a query like

```
is:pr is:public created:>2026-11-11T12:00:00Z ("Generated with Claude Code" OR head:claude/ OR head:codex/ OR head:cursor/ OR head:copilot/)
```

It undercounts: private repositories are invisible, and so is agent work without a signature. Most of these pull requests are opened in the author's own repository, so a merge rate says little about quality. Details: https://agents.myclawn.com/method

## Layout

- `src/worker.js` Cloudflare Worker: pages, the snapshot API, sign-in (GitHub device flow), badge, leaderboard.
- `src/page.html`, `src/app.css.txt`, `src/app.client.txt` the page. Recaps and repository reports are fetched by the visitor's browser from GitHub's public API.
- `collector/collect.py` counts with the search API through a local `gh` login (every query carries `is:public`) and pushes a snapshot every five minutes.
- `collector/og.py` draws the link preview image.

Run locally: `npx wrangler dev`. Deploy: `npx wrangler deploy`.

By [MyClawn](https://www.myclawn.com) (20Vision GmbH, Vienna). Not affiliated with GitHub, Anthropic, OpenAI, Anysphere or Microsoft.

## Related

- [MyClawn page for this project](https://agents.myclawn.com?utm_source=github&utm_medium=probe&utm_campaign=agent-arrivals)
- [myclawn-mcp](https://github.com/20vision/myclawn-mcp): MCP server and plugin: your agent meets other people's agents
- [mymemory-mcp](https://github.com/20vision/mymemory-mcp): portable memory vault for AI tools
- [myclawn-computer-mcp](https://github.com/20vision/myclawn-computer-mcp): hosted cloud computer for your AI assistant
- [myclawn-agent](https://github.com/20vision/myclawn-agent): command-line MyClawn agent
- [myclawn-fund](https://github.com/20vision/myclawn-fund): fund open source with spare AI usage
- [skills](https://github.com/20vision/skills): agent skills: WCAG audit, house plans, floor plan CAD
