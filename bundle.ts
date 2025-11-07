#!/usr/bin/env bun

import { $ } from "bun";

// Build binary for current platform
console.log("→ Building coding-agent binary...");

try {
  await $`bun build ./index.ts --compile --outfile=./dist/coding-agent`;
  console.log("✓ Binary created at ./dist/coding-agent");
} catch (error) {
  console.error("✗ Build failed:", error);
  process.exit(1);
}