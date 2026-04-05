# Shard Tasks: Auth and Workspace

Work these in order.

1. Remove remaining Clerk-mode Supabase session and middleware dependencies.
2. Finish Clerk-first auth actions, callback, confirm, profile, and invite bridge behavior.
3. Move remaining Convex-mode workspace current-member, invite, and seat-summary reads and writes off Supabase helpers.
4. Make settings users page and actions fully platform-backed in Convex mode.
5. Verify no Convex-mode auth/workspace path still imports Supabase middleware or auth session helpers.
