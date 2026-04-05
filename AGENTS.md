# Repository Instructions

When I say "promote to production," always make sure the worktree is on its own branch first. If the worktree is detached, create a new branch for it using the required `codex/` prefix, commit the current changes with a concise message, then rebase that branch onto `origin/main`, fast-forward merge it into `main`, and push `origin/main`.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
