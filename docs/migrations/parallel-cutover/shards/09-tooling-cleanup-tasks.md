# Shard Tasks: Tooling and Cleanup

Only start after runtime shards are merged or nearly merged.

1. Replace the E2E auth helper with Clerk and Convex provisioning.
2. Replace or archive required Supabase-backed scripts with Convex or Clerk equivalents.
3. Remove Supabase env requirements from shipped runtime.
4. Remove `@supabase/*` packages and lockfile references.
5. Delete or archive `src/lib/supabase/**` and `supabase/**` only after runtime is fully clear.
