# SOURCES — project skills (`.dsh/skills`)

Project-scoped DSH skill root. Rank 100 in `packages/dsh-skill-filesystem`, so it
wins over `~/.dsh/skills` (400) for any cwd inside this repository. These skills
are vendored here on purpose: they only make sense while working on this
front-end project.

## smooth-option-switcher

- **Upstream**: https://github.com/zhoulinhua0-star/smooth-option-switcher.git
  at `190a9fca0dcaed44767b723cfc2edb179d6dfdc8` (2026-09-22, initial commit).
- **Installed**: the whole `skills/smooth-option-switcher/` package — `SKILL.md`,
  `references/` (canonical HTML + native nested CSS, accessible/reduced-motion
  variant, production guidance, provenance and verification notes,
  `verified-states.png`), `scripts/verify.cjs`, and `agents/openai.yaml`.
- **Not installed**: the repository's `.claude-plugin/` marketplace files, which
  belong to Claude Code's plugin installer and mean nothing to DSH.
- **DSH adaptations** — `SKILL.md` only, 4 added lines, no upstream text altered:
  1. Resource-base note: DSH prints `Base directory for this skill:` inside
     `<skill_resources>`, so `references/…` must be resolved against that path,
     not against the workspace cwd.
  2. Verification note: `scripts/verify.cjs` is optional and needs Playwright plus
     Chromium; both HTML examples run with no build step and no JavaScript.
  - Nothing had to be removed: the upstream frontmatter is already DSH-legal
    (`name` + `description`, lowercase-hyphen name grammar, no legacy
    `disableModelInvocation` / `modelInvocable` / `userInvocable` keys), and DSH
    ignores unknown fields.
- **Update**: clone upstream, re-copy `skills/smooth-option-switcher/*`, then
  re-apply the two `SKILL.md` notes above.
- **Verified** in this repository at install time with headless Chrome
  154.0.8037.57 driven over CDP: 80/80 checks, including the transition samples
  recorded in `references/verification.md`.
