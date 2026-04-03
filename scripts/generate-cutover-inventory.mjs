import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "docs", "migrations");
const outputFile = path.join(
  outputDir,
  "2026-03-29-supabase-clerk-convex-inventory.md",
);

function runRg(args) {
  // Try ripgrep first
  try {
    return execFileSync("rg", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    if (error.code === "ENOENT") {
      // rg not available, fall back to grep
      return runGrepFallback(args);
    }
    if (error.status === 1) {
      return ""; // No matches
    }
    throw error;
  }
}

function runGrepFallback(args) {
  // rg args format: ["-l", pattern, ...paths]
  // grep equivalent: ["-rl", "--include=*.ts", "--include=*.tsx", "--include=*.js", "--include=*.mjs", pattern, ...paths]
  const flagArgs = [];
  const paths = [];
  let pattern = null;
  let listFilesOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-l") {
      listFilesOnly = true;
    } else if (args[i].startsWith("-")) {
      flagArgs.push(args[i]);
    } else if (pattern === null) {
      pattern = args[i];
    } else {
      paths.push(args[i]);
    }
  }

  if (!pattern) return "";

  const grepArgs = ["-rl", "-E", pattern, ...paths];

  try {
    return execFileSync("grep", grepArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    if (error.status === 1) {
      return ""; // No matches
    }
    throw error;
  }
}

function asList(value) {
  if (!value) {
    return [];
  }
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

const runtimeFiles = asList(
  runRg([
    "-l",
    "@/lib/supabase|@supabase|supabase\\.",
    "src",
    "e2e",
    "scripts",
    "next.config.mjs",
    "package.json",
    "src/env.ts",
  ]),
);

const tableNames = asList(
  runRg([
    "-n",
    "from\\(\\\"[a-zA-Z0-9_]+\\\"\\)|from\\('[a-zA-Z0-9_]+'\\)",
    "src",
    "scripts",
    "e2e",
  ])
    .split("\n")
    .map((line) =>
      line.replace(/.*from\(["']([^"']+)["']\).*/, "$1"),
    )
    .join("\n"),
);

const countedTables = Object.entries(
  tableNames.reduce((accumulator, name) => {
    accumulator[name] = (accumulator[name] ?? 0) + 1;
    return accumulator;
  }, {}),
)
  .map(([name, count]) => ({ name, count }))
  .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

const envVars = uniqueSorted(
  asList(
    runRg([
      "--no-filename",
      "-o",
      "NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_[A-Z0-9_]+",
      "src",
      "scripts",
      "e2e",
      "next.config.mjs",
      "supabase",
    ]),
  ),
);

const supabaseConfigFiles = uniqueSorted(
  asList(runRg(["--files", "supabase"])),
);

const routeFiles = runtimeFiles.filter((file) => file.startsWith("src/app/") || file === "src/middleware.ts");
const srcFiles = runtimeFiles.filter((file) => file.startsWith("src/"));
const scriptFiles = runtimeFiles.filter((file) => file.startsWith("scripts/"));
const e2eFiles = runtimeFiles.filter((file) => file.startsWith("e2e/"));

const storageBuckets = uniqueSorted(
  asList(
    runRg([
      "--no-filename",
      "-o",
      "listing-logos|listing-photos|client-documents|agreement-documents|social-posts|job-resumes",
      "src",
      "supabase",
      "docs",
    ]),
  ),
);

const replacementMap = [
  {
    surface: "Auth and session",
    current: "Supabase Auth cookies, session refresh middleware, auth server actions, browser auth subscriptions",
    target: "Clerk users and sessions only, exposed through the platform auth facade",
  },
  {
    surface: "Workspace and role model",
    current: "Supabase profiles, profile_memberships, profile_invitations, synthetic owner fallback",
    target: "Convex users, workspaces, memberships, invitations, single active workspace guards",
  },
  {
    surface: "Primary domain data",
    current: "Supabase Postgres tables queried directly from page components, actions, and route handlers",
    target: "Convex queries, mutations, actions, and denormalized read models",
  },
  {
    surface: "Files and document access",
    current: "Supabase Storage buckets plus public URL construction in app code",
    target: "Convex File Storage plus file metadata documents and authorized delivery helpers",
  },
  {
    surface: "Billing linkage",
    current: "Supabase profile and addon records mutated inside Stripe handlers",
    target: "Convex billing-supporting records with preserved Stripe customer and subscription linkage",
  },
  {
    surface: "Search and public pages",
    current: "Join-heavy Supabase reads powering provider pages, jobs pages, and sitemaps",
    target: "Convex-maintained search and public read model documents",
  },
  {
    surface: "Tests and seed flows",
    current: "Supabase-backed E2E auth helper, seed scripts, and direct data cleanup scripts",
    target: "Clerk + Convex provisioning helpers, import tooling, and reconciliation scripts",
  },
];

function toBulletList(items) {
  if (items.length === 0) {
    return "- none";
  }
  return items.map((item) => `- \`${item}\``).join("\n");
}

function toCountTable(items) {
  if (items.length === 0) {
    return "| Surface | Count |\n| --- | ---: |\n| none | 0 |";
  }

  return [
    "| Surface | Count |",
    "| --- | ---: |",
    ...items.map((item) => `| \`${item.name}\` | ${item.count} |`),
  ].join("\n");
}

function toReplacementTable(items) {
  return [
    "| Surface | Current dependency | Target replacement |",
    "| --- | --- | --- |",
    ...items.map(
      (item) =>
        `| ${item.surface} | ${item.current} | ${item.target} |`,
    ),
  ].join("\n");
}

mkdirSync(outputDir, { recursive: true });

const markdown = `# Supabase to Clerk and Convex Inventory

Generated on \`${new Date().toISOString()}\` from the current repository state.

## Summary

- Runtime files with Supabase references: ${runtimeFiles.length}
- App and middleware route surfaces with Supabase references: ${routeFiles.length}
- Source files with Supabase references: ${srcFiles.length}
- E2E files with Supabase references: ${e2eFiles.length}
- Scripts with Supabase references: ${scriptFiles.length}
- Supabase config and migration files: ${supabaseConfigFiles.length}
- Referenced Postgres tables: ${countedTables.length}
- Referenced storage buckets: ${storageBuckets.length}
- Referenced Supabase env vars: ${envVars.length}

## Frozen Replacement Map

${toReplacementTable(replacementMap)}

## Referenced Tables

${toCountTable(countedTables)}

## Referenced Storage Buckets

${toBulletList(storageBuckets)}

## Referenced Env Vars

${toBulletList(envVars)}

## Route and Runtime Surfaces

${toBulletList(routeFiles)}

## Supabase-Backed Scripts

${toBulletList(scriptFiles)}

## Supabase-Backed E2E Helpers

${toBulletList(e2eFiles)}

## Supabase Config and Migrations

${toBulletList(supabaseConfigFiles)}

## Immediate Cutover Risks

- The current repo still depends on Supabase auth middleware and browser session listeners for dashboard access control.
- The current repo still exposes Supabase public storage URL assumptions in runtime code and config.
- Stripe webhooks and billing actions still persist directly into Supabase profile and addon records.
- Public search, public pages, jobs pages, CRM flows, referrals, agreements, and notifications still execute direct table queries instead of going through a backend facade.
- E2E auth setup and seed scripts still require Supabase service-role credentials.
`;

writeFileSync(outputFile, markdown);
process.stdout.write(`${path.relative(repoRoot, outputFile)}\n`);
