import fs from "node:fs";
import path from "node:path";

const appRoot = path.join(process.cwd(), "src/app");

const requiredRoutes = [
  { path: "/pricing", reason: "GoodABA pricing canonical route" },
  { path: "/goodaba-internal", reason: "GoodABA landing rewrite target" },
  { path: "/goodaba-internal/pricing", reason: "GoodABA pricing rewrite target" },
  { path: "/jobs", reason: "Jobs home canonical route" },
  { path: "/jobs/post/:slug", reason: "Canonical public job detail route" },
  { path: "/jobs/employers", reason: "Canonical employers index route" },
  { path: "/jobs/employers/post", reason: "Canonical employer posting route" },
  { path: "/jobs/employers/:slug", reason: "Canonical employer profile route" },
  { path: "/jobs/role/:position", reason: "Canonical role-based jobs route" },
  { path: "/provider/:slug", reason: "Canonical provider brochure route" },
  { path: "/provider/:slug/contact", reason: "Canonical provider contact route" },
  { path: "/provider/:slug/intake", reason: "Canonical provider intake route" },
  { path: "/provider/:slug/documents", reason: "Canonical provider document upload route" },
  { path: "/provider/:slug/resources", reason: "Canonical provider resources route" },
  { path: "/provider/:slug/resources/faq", reason: "Canonical provider FAQ route" },
  { path: "/provider/:slug/resources/glossary", reason: "Canonical provider glossary route" },
  { path: "/provider/:slug/resources/guides", reason: "Canonical provider guides index route" },
  { path: "/provider/:slug/resources/guides/:guideSlug", reason: "Canonical provider guide detail route" },
  { path: "/provider/:slug/careers", reason: "Canonical provider careers route" },
  { path: "/provider/:slug/jobs/:jobSlug", reason: "Canonical branded provider job detail route" },
];

function walkPages(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPages(fullPath, acc);
      continue;
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      acc.push(fullPath);
    }
  }

  return acc;
}

function segmentToRouteToken(segment) {
  if (/^\(.*\)$/.test(segment)) return null;
  if (/^\[\.\.\..+\]$/.test(segment)) return "*";
  if (/^\[\[\.{3}.+\]\]$/.test(segment)) return "*";
  if (/^\[.+\]$/.test(segment)) return `:${segment.slice(1, -1)}`;
  return segment;
}

function fileToRoutePattern(filePath) {
  const relPath = path.relative(appRoot, filePath).replaceAll(path.sep, "/");
  const segments = relPath.split("/").slice(0, -1);
  const routeSegments = segments
    .map(segmentToRouteToken)
    .filter(Boolean);

  return routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;
}

const pageFiles = walkPages(appRoot);
const actualRoutes = new Map();

for (const filePath of pageFiles) {
  const routePattern = fileToRoutePattern(filePath);
  const fileList = actualRoutes.get(routePattern) ?? [];
  fileList.push(path.relative(process.cwd(), filePath).replaceAll(path.sep, "/"));
  actualRoutes.set(routePattern, fileList);
}

const missing = requiredRoutes.filter(({ path: requiredPath }) => !actualRoutes.has(requiredPath));

if (missing.length > 0) {
  console.error("Missing required public route aliases:\n");
  for (const route of missing) {
    console.error(`- ${route.path}: ${route.reason}`);
  }
  process.exit(1);
}

console.log("Public route alias audit passed.");
