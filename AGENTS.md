# Repository Instructions

When I say "promote to production," always do the full production workflow, not just the git push.

Required production workflow:

1. Make sure the worktree is on its own branch first. If the worktree is detached, create a new branch for it using the required `codex/` prefix.
2. Before promoting, review the changed files and run the most relevant pre-production checks for the affected codepaths. At minimum, run targeted verification for the user-facing behavior being changed. If there are available build, typecheck, lint, test, or route-specific verification commands that are relevant, run them before promotion when feasible.
3. If any files under `convex/` changed, treat this as requiring a Convex production deploy in addition to the normal app deployment.
4. Commit the current changes with a concise message.
5. Rebase that branch onto `origin/main`.
6. Fast-forward merge it into `main`.
7. Push `origin/main`.
8. Assume that pushing `main` triggers the Vercel production deployment for this repo, and verify the deployment status instead of assuming it succeeded.
9. If any files under `convex/` changed, also deploy Convex production changes with `CONVEX_DEPLOYMENT=prod:youthful-gazelle-739 npx convex deploy`.
10. After promotion, verify the affected production routes, queries, or user flows against the real production environment.
11. Do not consider the production promotion complete until all required pieces have succeeded: git push, Vercel production deployment, any required Convex production deploy, and post-deploy verification.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
