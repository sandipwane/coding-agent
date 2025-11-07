import * as readline from 'node:readline';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import type { ModelMessage } from 'ai';
import { stepCountIs, streamText, tool } from 'ai';
import { z } from 'zod';

// Initialize Bedrock with Vercel AI SDK
const bedrock = createAmazonBedrock({
  region: Bun.env.AWS_REGION || 'us-east-1',
  accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
function getUserInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

const handleExit = () => {
  console.log('Goodbye! Have a nice day!');
  rl.close();
  process.exit(0);
};

process.on('SIGINT', handleExit);

// Tool descriptions as constants for better readability
const TOOL_DESCRIPTIONS = {
  READ: ['Read the contents of a file from the filesystem'].join(' '),

  WRITE: [
    'Write content to a file on the filesystem.',
    'Use this for creating new files or completely replacing file contents.',
    'For editing existing files, prefer using apply_diff instead.',
  ].join(' '),

  APPLY_DIFF: [
    'Apply a diff to an existing file by replacing specific content.',
    'This is more efficient than rewriting entire files.',
    'Provide the exact text to find (old_string) and what to replace it with (new_string).',
  ].join(' '),

  BASH: ['Execute shell commands on the system'].join(' '),
} as const;

// Define tools
const tools = {
  read: tool({
    description: TOOL_DESCRIPTIONS.READ,
    inputSchema: z.object({
      filePath: z.string().describe('The path to the file to read'),
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
        return 'Unknown error reading file';
      }
    },
  }),

  write: tool({
    description: TOOL_DESCRIPTIONS.WRITE,
    inputSchema: z.object({
      filePath: z.string().describe('The path to the file to write'),
      content: z.string().describe('The content to write to the file'),
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
        return 'Unknown error writing file';
      }
    },
  }),

  apply_diff: tool({
    description: TOOL_DESCRIPTIONS.APPLY_DIFF,
    inputSchema: z.object({
      filePath: z.string().describe('The path to the file to edit'),
      old_string: z
        .string()
        .describe('The exact text to find and replace (must match exactly including whitespace)'),
      new_string: z.string().describe('The new text to replace the old text with'),
      replace_all: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, replace all occurrences. If false, only replace the first occurrence (default: false)',
        ),
    }),
    execute: async ({ filePath, old_string, new_string, replace_all }) => {
      try {
        console.log(`\n\n [-] APPLY_DIFF: ${filePath}\n`);

        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          return `Error: File not found: ${filePath}. Use the write tool to create new files.`;
        }

        // Read current content
        const content = await file.text();

        // Check if old_string exists in the file
        if (!content.includes(old_string)) {
          return `Error: Could not find the specified text in ${filePath}. Make sure old_string matches exactly (including whitespace and indentation).`;
        }

        // Apply the replacement
        let newContent: string;
        if (replace_all) {
          newContent = content.replaceAll(old_string, new_string);
          const occurrences = content.split(old_string).length - 1;
          console.log(`    ├─ Replacing all ${occurrences} occurrence(s)\n`);
        } else {
          newContent = content.replace(old_string, new_string);
          console.log(`    ├─ Replacing first occurrence\n`);
        }

        // Write the updated content
        await Bun.write(filePath, newContent);

        const oldSize = new TextEncoder().encode(content).length;
        const newSize = new TextEncoder().encode(newContent).length;
        const diff = newSize - oldSize;
        const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

        return `Diff applied successfully to: ${filePath} (${oldSize} → ${newSize} bytes, ${diffStr})`;
      } catch (error) {
        if (error instanceof Error) {
          return `Error applying diff: ${error.message}`;
        }
        return 'Unknown error applying diff';
      }
    },
  }),

  bash: tool({
    description: TOOL_DESCRIPTIONS.BASH,
    inputSchema: z.object({
      command: z.string().describe('The shell command to execute'),
      description: z.string().optional().describe('Optional description of what this command does'),
      workingDirectory: z
        .string()
        .optional()
        .describe('Working directory for command execution (defaults to current directory)'),
      timeout: z
        .number()
        .optional()
        .default(30000)
        .describe('Timeout in milliseconds (default: 30000)'),
    }),
    execute: async ({ command, description, workingDirectory, timeout }) => {
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
        const proc = Bun.spawn(['/bin/sh', '-c', command], {
          cwd: cwd,
          stdout: 'pipe',
          stderr: 'pipe',
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
          const output = stdout + (stderr ? `\nstderr: ${stderr}` : '');

          console.log(`\n\n [+] ${output}\n`);

          return {
            title: command,
            metadata: {
              output: output || '(no output)',
              exit: exitCode,
              description: description,
            },
            output: output || '(no output)',
          };
        } catch (timeoutError) {
          // Clear timeout on error
          if (timeoutId) clearTimeout(timeoutId);

          if (timeoutError instanceof Error && timeoutError.message.includes('timed out')) {
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
        const errorMsg =
          error instanceof Error
            ? `Error executing command: ${error.message}`
            : 'Unknown error executing command';

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
  }),
};

async function main() {
  console.log('\n' + 'Claude CLI v0.2');
  console.log('------------------------------------------------');
  console.log('Type your questions and press Enter to chat.');
  console.log('Press Ctrl+C to leave the chat.');
  console.log('');

  const conversationHistory: ModelMessage[] = [];

  while (true) {
    try {
      const userMessage = await getUserInput('> ');

      // Skip when user presses Enter
      if (userMessage.trim() === '') {
        continue;
      }

      // Store user message in history
      conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Stream response from Claude via Bedrock with multi-step tool calling
      console.log('');
      process.stdout.write('✶ ');

      let _fullResponse = '';
      const result = streamText({
        model: bedrock('anthropic.claude-3-5-sonnet-20240620-v1:0'),
        system: `You are an expert coding assistant with access to file system operations and shell commands.

TOOL USAGE GUIDELINES:

1. **File Reading (read tool)**:
   - Always read a file before editing it to understand its current contents
   - Use this to gather context before making changes

2. **File Editing (apply_diff tool)** - PREFERRED for modifications:
   - Use this for editing existing files - it's much more efficient than rewriting
   - Provide the exact old_string to find (including whitespace and indentation)
   - Provide the new_string to replace it with
   - Set replace_all: true to replace all occurrences, or false for just the first
   - This is faster and uses fewer tokens than the write tool

3. **File Creation (write tool)**:
   - Only use this for creating NEW files
   - Or when you need to completely rewrite an entire file
   - For edits, prefer apply_diff instead

4. **Shell Commands (bash tool)**:
   - Use for running tests, builds, git commands, package managers, etc.
   - Provide clear descriptions of what each command does
   - Set appropriate timeouts for long-running commands

BEST PRACTICES:
- Always read before you edit
- Use apply_diff for targeted changes to save time and tokens
- Be precise with old_string in apply_diff - match whitespace exactly
- Explain your reasoning and steps clearly
- Handle errors gracefully and inform the user`,
        messages: conversationHistory,
        tools,
        stopWhen: stepCountIs(25), // Allow up to 25 steps (tool calls + responses)
      });

      // Stream ALL text from all steps (including after tool execution)
      for await (const textPart of result.fullStream) {
        if (textPart.type === 'text-delta') {
          process.stdout.write(textPart.text);
          _fullResponse += textPart.text;
        }
      }

      console.log('\n');

      // Wait for the complete response with all steps
      const response = await result.response;

      // Add all response messages to conversation history
      conversationHistory.push(...response.messages);
    } catch (error) {
      if (error instanceof Error) {
        console.error('[Error]:', error.message);
      } else {
        console.error('[Error]: An unknown error occurred');
      }
    }
  }
}

main();
