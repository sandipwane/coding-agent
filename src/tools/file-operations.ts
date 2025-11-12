import { tool } from "ai";
import { z } from "zod";

/**
 * File Operations
 * Read and write capabilities for the filesystem
 */
namespace FileOperations {
  export const read = tool({
    description: "Read the contents of a file from the filesystem",
    inputSchema: z.object({
      filePath: z.string().describe("The path to the file to read"),
    }),
    execute: async ({ filePath }) => {
      try {
        console.log(`\n\n [-] READ: ${filePath}\n`);

        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          return `Error: File not found: ${filePath}`;
        }

        const content = await file.text();
        return content;
      } catch (error) {
        if (error instanceof Error) {
          return `Error reading file: ${error.message}`;
        }
        return "Unknown error reading file";
      }
    },
  });

  export const write = tool({
    description: "Write content to a file on the filesystem",
    inputSchema: z.object({
      filePath: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
    execute: async ({ filePath, content }) => {
      try {
        console.log(`\n\n [-] WRITE: ${filePath}\n`);

        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (exists) {
          console.log(`    └─ Overwriting existing file\n`);
        }

        await Bun.write(filePath, content);
        const bytesWritten = new TextEncoder().encode(content).length;

        return `File written successfully to: ${filePath} (${bytesWritten} bytes)`;
      } catch (error) {
        if (error instanceof Error) {
          return `Error writing file: ${error.message}`;
        }
        return "Unknown error writing file";
      }
    },
  });

  // TODO: Add apply diffs tool for surgical modifications
}

export default FileOperations;