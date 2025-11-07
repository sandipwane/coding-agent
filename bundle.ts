#!/usr/bin/env bun

import { $ } from "bun";
import { version } from "./package.json";

// Build binary for current platform (chai-cli)
console.log(`→ Building chai-cli v${version} binary...`);

try {
  await $`bun build ./index.ts --compile --outfile=./dist/chai-cli-v${version}`;
  console.log(`✓ Binary created at ./dist/chai-cli-v${version}`);
} catch (error) {
  console.error("✗ Build failed:", error);
  process.exit(1);
}