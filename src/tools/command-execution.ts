import { tool } from "ai";
import { z } from "zod";

/**
 * Command Execution
 * Shell command execution with timeout support
 */
namespace CommandExecution {
  export interface BashExecutionResult {
    title: string;
    metadata: {
      output: string;
      exit: number;
      description?: string;
    };
    output: string;
  }

  export const bash = tool({
    description: "Execute shell commands on the system",
    inputSchema: z.object({
      command: z.string().describe("The shell command to execute"),
      description: z.string().optional().describe("Optional description of what this command does"),
      workingDirectory: z.string().optional().describe("Working directory for command execution (defaults to current directory)"),
      timeout: z.number().optional().default(30000).describe("Timeout in milliseconds (default: 30000)"),
    }),
    execute: async ({ command, description, workingDirectory, timeout }): Promise<BashExecutionResult> => {
      try {
        // Validate working directory if provided
        const cwd = workingDirectory || process.cwd();
        if (workingDirectory) {
          const dirExists = await Bun.file(workingDirectory).exists();
          if (!dirExists) {
            const errorMsg = `Error: Working directory does not exist: ${workingDirectory}`;
            return {
              title: command,
              metadata: {
                output: errorMsg,
                exit: -1,
                description: description,
              },
              output: errorMsg,
            };
          }
        }

        // Log execution details
        console.log(`\n\n [-] BASH: ${command}\n`);
        if (description) {
          console.log(`    ├─ Description: ${description}`);
        }
        if (workingDirectory) {
          console.log(`    ├─ Working dir: ${workingDirectory}`);
        }

        // Execute command using Bun.spawn
        const proc = Bun.spawn(["/bin/sh", "-c", command], {
          cwd: cwd,
          stdout: "pipe",
          stderr: "pipe",
          env: process.env,
        });

        // Set up timeout
        let timeoutId: Timer | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            proc.kill();
            reject(new Error(`Command timed out after ${timeout}ms`));
          }, timeout);
        });

        // Execute and capture output
        try {
          const [stdout, stderr, exitCode] = await Promise.race([
            Promise.all([
              new Response(proc.stdout).text(),
              new Response(proc.stderr).text(),
              proc.exited,
            ]),
            timeoutPromise,
          ]);

          // Clear timeout if command completed
          if (timeoutId) clearTimeout(timeoutId);

          // Combine stdout and stderr
          const output = stdout + (stderr ? `\nstderr: ${stderr}` : "");

          console.log(`\n\n [+] ${output}\n`);

          return {
            title: command,
            metadata: {
              output: output || "(no output)",
              exit: exitCode,
              description: description,
            },
            output: output || "(no output)",
          };
        } catch (timeoutError) {
          // Clear timeout on error
          if (timeoutId) clearTimeout(timeoutId);

          if (timeoutError instanceof Error && timeoutError.message.includes("timed out")) {
            const errorMsg = timeoutError.message;
            return {
              title: command,
              metadata: {
                output: errorMsg,
                exit: -1,
                description: description,
              },
              output: errorMsg,
            };
          }
          throw timeoutError;
        }
      } catch (error) {
        const errorMsg = error instanceof Error
          ? `Error executing command: ${error.message}`
          : "Unknown error executing command";

        return {
          title: command,
          metadata: {
            output: errorMsg,
            exit: -1,
            description: description,
          },
          output: errorMsg,
        };
      }
    },
  });
}

export default CommandExecution;