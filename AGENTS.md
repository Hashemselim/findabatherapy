# Repository Instructions

When I say "promote to production," always make sure the worktree is on its own branch first. If the worktree is detached, create a new branch for it using the required `codex/` prefix, commit the current changes with a concise message, then rebase that branch onto `origin/main`, fast-forward merge it into `main`, and push `origin/main`.
