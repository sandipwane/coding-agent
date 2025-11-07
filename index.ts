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

// ANSI color codes
const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
} as const;

// Visual separators and markers
const UI = {
  divider: '─'.repeat(50),
  dot: '•',
  arrow: '→',
  check: '✓',
  cross: '✗',
  spinner: '⣷⣯⣟⡿⢿⣻⣽⣾',
  box: {
    top: '┌─',
    mid: '├─',
    bot: '└─',
    vert: '│',
  },
  diff: {
    removed: '-',
    added: '+',
  },
} as const;

// Logger configuration
const LOG_CONFIG = {
  indent: '  ',
  prefixes: {
    tool: (action: string) => `${UI.box.mid} ${action.toUpperCase()}`,
    detail: `${UI.box.vert}  `,
    block: `${UI.box.vert}    `,
    output: `${UI.box.bot}`,
    success: `${UI.check}`,
    error: `${UI.cross}`,
  },
  app: {
    name: 'CHAI CLI',
    version: 'v0.3',
  },
} as const;

// Helper to output with optional formatting
const output = (message: string, method: 'log' | 'error' = 'log') => console[method](message);

// Helper to format indented block
const formatBlock = (body: string, indent = LOG_CONFIG.prefixes.block) =>
  (body.trim() || '(no output)')
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');

// Track execution times
const executionTimes = new Map<string, number>();

// Loading indicator state
let loadingInterval: Timer | undefined;
let loadingMessage = '';

const logger = {
  startLoading: (message: string) => {
    loadingMessage = message;
    let spinnerIndex = 0;
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    loadingInterval = setInterval(() => {
      process.stdout.write(`\r${spinnerChars[spinnerIndex]} ${loadingMessage}`);
      spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    }, 80);
  },

  stopLoading: () => {
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = undefined;
      // Clear the loading line
      process.stdout.write('\r' + ' '.repeat(loadingMessage.length + 3) + '\r');
    }
  },
  banner: () =>
    output(
      [
        '',
        `${UI.box.top} ${LOG_CONFIG.app.name} ${LOG_CONFIG.app.version}`,
        UI.divider,
        `${UI.dot} Type to chat, Ctrl+C to exit`,
        '',
      ].join('\n'),
    ),

  tool: (action: string, target: string, id?: string) => {
    logger.stopLoading(); // Stop any existing loading
    output(`\n${LOG_CONFIG.prefixes.tool(action)} ${target}`);
    if (id) {
      executionTimes.set(id, Date.now());
      logger.startLoading(`${action.toLowerCase()}ing ${target}`);
    }
  },

  detail: (message: string) => output(`${LOG_CONFIG.prefixes.detail} ${message}`),

  block: (body: string, collapsed = false) => {
    if (collapsed && body.split('\n').length > 10) {
      const lines = body.split('\n');
      const preview = lines.slice(0, 3).join('\n');
      const remaining = lines.length - 3;
      output(
        [
          `${LOG_CONFIG.prefixes.block}${preview}`,
          `${LOG_CONFIG.prefixes.detail} ... ${remaining} more lines ...`,
        ].join('\n'),
      );
    } else {
      output(formatBlock(body, LOG_CONFIG.prefixes.block));
    }
  },

  output: (body: string, id?: string) => {
    logger.stopLoading(); // Stop loading indicator
    let timeStr = '';
    if (id && executionTimes.has(id)) {
      const elapsed = Date.now() - executionTimes.get(id)!;
      timeStr = ` (${elapsed}ms)`;
      executionTimes.delete(id);
    }
    output(`${LOG_CONFIG.prefixes.output} output${timeStr}:`);
    logger.block(body);
  },

  success: (message: string) => output(`  ${LOG_CONFIG.prefixes.success} ${message}`),

  error: (message: string) => output(`  ${LOG_CONFIG.prefixes.error} ${message}`, 'error'),

  diff: (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // Show removed lines in red
    oldLines.forEach(line => {
      output(`${LOG_CONFIG.prefixes.detail} ${COLORS.red}${UI.diff.removed} ${line}${COLORS.reset}`);
    });

    // Show added lines in green
    newLines.forEach(line => {
      output(`${LOG_CONFIG.prefixes.detail} ${COLORS.green}${UI.diff.added} ${line}${COLORS.reset}`);
    });
  },

  lineBreak: () => output(''),
};

// Helper function to get user input
function getUserInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

const handleExit = () => {
  logger.success('Goodbye! Have a nice day!');
  rl.close();
  process.exit(0);
};

process.on('SIGINT', handleExit);

// Tool descriptions as constants for better readability
const TOOL_DESCRIPTIONS = {
  READ: 'Read the contents of a file from the filesystem',

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

  BASH: 'Execute shell commands on the system',
} as const;

const SYSTEM_PROMPT = `
  You are CHAI: CloudHedge's Agentic Intelligence. You are help users with their coding tasks.
  Send output which is easy to render in terminal. 

  Communication Style:
  - Avoid grammar for concision.

  Context:
  - You are a coding assistant that can help with coding tasks.
  - You are currently in the following directory: ${process.cwd()}
  - You are using the following tools: ${Object.keys(TOOL_DESCRIPTIONS).join(', ')}
  - Start by exploring the file system and understanding the context of the user's request.

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
  - Handle errors gracefully and inform the user
`.trim();

// Define tools
const tools = {
  read: tool({
    description: TOOL_DESCRIPTIONS.READ,
    inputSchema: z.object({
      filePath: z.string().describe('The path to the file to read'),
    }),
    execute: async ({ filePath }) => {
      const toolId = `read-${Date.now()}`;
      try {
        logger.tool('READ', filePath, toolId);

        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          const error = `Error: File not found: ${filePath}`;
          logger.output(error, toolId);
          return error;
        }

        const content = await file.text();
        const lines = content.split('\n').length;
        logger.output(`${lines} lines read`, toolId);
        return content;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? `Error reading file: ${error.message}`
            : 'Unknown error reading file';
        logger.output(errorMsg, toolId);
        return errorMsg;
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
      const toolId = `write-${Date.now()}`;
      try {
        logger.tool('WRITE', filePath, toolId);

        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (exists) {
          logger.detail('Overwriting existing file');
        }

        await Bun.write(filePath, content);
        const bytesWritten = new TextEncoder().encode(content).length;

        const result = `File written successfully (${bytesWritten} bytes)`;
        logger.output(result, toolId);
        return `${result} to: ${filePath}`;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? `Error writing file: ${error.message}`
            : 'Unknown error writing file';
        logger.output(errorMsg, toolId);
        return errorMsg;
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
      const toolId = `diff-${Date.now()}`;
      try {
        logger.tool('APPLY_DIFF', filePath, toolId);

        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          const error = `Error: File not found: ${filePath}. Use the write tool to create new files.`;
          logger.output(error, toolId);
          return error;
        }

        // Read current content
        const content = await file.text();

        // Check if old_string exists in the file
        if (!content.includes(old_string)) {
          const error = `Error: Could not find the specified text in ${filePath}`;
          logger.output(error, toolId);
          return `${error}. Make sure old_string matches exactly (including whitespace and indentation).`;
        }

        // Show the diff before applying changes
        logger.diff(old_string, new_string);

        // Apply the replacement
        let newContent: string;
        let occurrences = 1;
        if (replace_all) {
          newContent = content.replaceAll(old_string, new_string);
          occurrences = content.split(old_string).length - 1;
          logger.detail(`Replacing all ${occurrences} occurrence(s)`);
        } else {
          newContent = content.replace(old_string, new_string);
          logger.detail('Replacing first occurrence');
        }

        // Write the updated content
        await Bun.write(filePath, newContent);

        const oldSize = new TextEncoder().encode(content).length;
        const newSize = new TextEncoder().encode(newContent).length;
        const diff = newSize - oldSize;
        const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

        const result = `Diff applied (${occurrences} changes, ${diffStr} bytes)`;
        logger.output(result, toolId);
        return `${result} to: ${filePath}`;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? `Error applying diff: ${error.message}`
            : 'Unknown error applying diff';
        logger.output(errorMsg, toolId);
        return errorMsg;
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
      const toolId = `bash-${Date.now()}`;
      try {
        // Validate working directory if provided
        const cwd = workingDirectory || process.cwd();
        if (workingDirectory) {
          const dirExists = await Bun.file(workingDirectory).exists();
          if (!dirExists) {
            const errorMsg = `Error: Working directory does not exist: ${workingDirectory}`;
            logger.tool('BASH', command, toolId);
            logger.output(errorMsg, toolId);
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
        logger.tool('BASH', command, toolId);
        if (description) {
          logger.detail(`${description}`);
        }
        if (workingDirectory) {
          logger.detail(`working dir: ${workingDirectory}`);
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

          logger.output(output || '(no output)', toolId);

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
            logger.output(errorMsg, toolId);
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

        logger.output(errorMsg, toolId);
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
  logger.banner();

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
      process.stdout.write('\n* ');

      let _fullResponse = '';
      const result = streamText({
        model: bedrock('anthropic.claude-3-5-sonnet-20240620-v1:0'),
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
        tools,
        stopWhen: stepCountIs(25), // Allow up to 25 steps (tool calls + responses)
      });

      // Stream ALL text from all steps (including after tool execution)
      for await (const textPart of result.fullStream) {
        if (textPart.type === 'text-delta') {
          // Add asterisk prefix for new lines in CHAI's response
          const text = textPart.text;

          process.stdout.write(text);
          _fullResponse += textPart.text;
        }
      }

      // need to have a line break after the response
      logger.lineBreak();

      // Wait for the complete response with all steps
      const response = await result.response;

      // Add all response messages to conversation history
      conversationHistory.push(...response.messages);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error('An unknown error occurred');
      }
    }
  }
}

main();
