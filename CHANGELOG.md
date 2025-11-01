# Changelog

## 2025-02-14

### docs: remove agent references from README
- Reworded the README documentation section so it speaks only to human contributors and doesn’t mention internal agent resources.

### chore: keep agent guide at root
- Restored `AGENTS.md` to the repository root (while keeping it git-ignored) so the latest instructions are easy to find locally.

### chore: move docs to agent resources
- Moved `AGENTS.md`, `arch.md`, and `ucspec.md` into the git-ignored `/agent-resources` folder and refreshed the public README to focus on human contributors.

### chore: document agent resources and changelog
- Added `/agent-resources` guidance to AGENTS.md, ensured the directory stays git-ignored, and introduced `CHANGELOG.md` for tracking commits.

### chore: remove template assets and fonts
- Removed create-next-app imagery and favicon, switched to system font stacks, and set BaiHoc-branded landing placeholder.

### chore: scaffold BaiHoc architecture
- Documented architecture expectations, added env/config/logging scaffolding, and initialized application directories per Nest-style layering.
