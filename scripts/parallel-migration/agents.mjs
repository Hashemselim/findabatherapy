#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = "/Users/hashemselim/Code/findabatherapy";
const manifestPath = path.join(
  repoRoot,
  "docs/migrations/parallel-cutover/agent-manifest.json",
);

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function usage() {
  console.log(`Usage:
  node scripts/parallel-migration/agents.mjs list
  node scripts/parallel-migration/agents.mjs show <agent-id>
  node scripts/parallel-migration/agents.mjs order
  node scripts/parallel-migration/agents.mjs prompt <agent-id>`);
}

function listAgents(manifest) {
  for (const agent of manifest.agents) {
    console.log(
      `${agent.id}\n  title: ${agent.title}\n  branch: ${agent.branch}\n  prompt: ${agent.promptFile}\n`,
    );
  }
}

function showAgent(manifest, id) {
  const agent = manifest.agents.find((entry) => entry.id === id);
  if (!agent) {
    console.error(`Unknown agent id: ${id}`);
    process.exit(1);
  }

  console.log(`id: ${agent.id}`);
  console.log(`title: ${agent.title}`);
  console.log(`branch: ${agent.branch}`);
  console.log(`prompt: ${agent.promptFile}`);
  console.log(`tasks: ${agent.taskFile}`);
  console.log(`hardDependencies: ${agent.hardDependencies.join(", ") || "(none)"}`);
  console.log(`softDependencies: ${agent.softDependencies.join(", ") || "(none)"}`);
  console.log("ownedPaths:");
  for (const ownedPath of agent.ownedPaths) {
    console.log(`  - ${ownedPath}`);
  }
  console.log("avoidPaths:");
  for (const avoidPath of agent.avoidPaths) {
    console.log(`  - ${avoidPath}`);
  }
  console.log("validationCommands:");
  for (const command of agent.validationCommands) {
    console.log(`  - ${command}`);
  }
}

function showOrder(manifest) {
  manifest.launchOrder.forEach((id, index) => {
    const agent = manifest.agents.find((entry) => entry.id === id);
    const title = agent ? agent.title : "(missing)";
    console.log(`${index + 1}. ${id} - ${title}`);
  });
}

function printPrompt(manifest, id) {
  const agent = manifest.agents.find((entry) => entry.id === id);
  if (!agent) {
    console.error(`Unknown agent id: ${id}`);
    process.exit(1);
  }

  const commonPromptPath = path.join(
    repoRoot,
    "docs/migrations/parallel-cutover/COMMON-WORKER-PROMPT.md",
  );
  const common = fs.readFileSync(commonPromptPath, "utf8").trim();
  const shardPrompt = fs.readFileSync(agent.promptFile, "utf8").trim();
  const taskPrompt = fs.readFileSync(agent.taskFile, "utf8").trim();

  console.log(`${common}\n\n${shardPrompt}\n\n${taskPrompt}`);
}

const manifest = readManifest();
const [, , command, arg] = process.argv;

switch (command) {
  case "list":
    listAgents(manifest);
    break;
  case "show":
    if (!arg) {
      usage();
      process.exit(1);
    }
    showAgent(manifest, arg);
    break;
  case "order":
    showOrder(manifest);
    break;
  case "prompt":
    if (!arg) {
      usage();
      process.exit(1);
    }
    printPrompt(manifest, arg);
    break;
  default:
    usage();
    process.exit(command ? 1 : 0);
}
