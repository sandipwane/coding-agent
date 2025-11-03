import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { streamText, tool, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";
import * as readline from "node:readline";

// Initialize Bedrock with Vercel AI SDK
const bedrock = createAmazonBedrock({
  region: Bun.env.AWS_REGION || "us-east-1",
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
  console.log("Goodbye! Have a nice day!");
  rl.close();
  process.exit(0);
};

process.on("SIGINT", handleExit);

// Define tools
const tools = {
  readFile: tool({
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
  }),
};

async function main() {
  console.log("\n"+"Claude CLI v0.1");
  console.log("------------------------------------------------");
  console.log("Type your questions and press Enter to chat.");
  console.log("Press Ctrl+C to leave the chat.");
  console.log("");

  const conversationHistory: ModelMessage[] = [];

  while (true) {
    try {
      const userMessage = await getUserInput("> ");

      // Skip when user presses Enter
      if (userMessage.trim() === "") {
        continue;
      }

      // Store user message in history
      conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Stream response from Claude via Bedrock with multi-step tool calling
      console.log("");
      process.stdout.write("✶ ");

      let fullResponse = "";
      const result = streamText({
        model: bedrock("anthropic.claude-3-5-sonnet-20240620-v1:0"),
        messages: conversationHistory,
        tools,
        stopWhen: stepCountIs(25), // Allow up to 25 steps (tool calls + responses)
      });

      // Stream ALL text from all steps (including after tool execution)
      for await (const textPart of result.fullStream) {
        if (textPart.type === 'text-delta') {
          process.stdout.write(textPart.text);
          fullResponse += textPart.text;
        }
      }

      console.log("\n");

      // Wait for the complete response with all steps
      const response = await result.response;

      // Add all response messages to conversation history
      conversationHistory.push(...response.messages);
    } catch (error) {
      if (error instanceof Error) {
        console.error("[Error]:", error.message);
      } else {
        console.error("[Error]: An unknown error occurred");
      }
    }
  }
}

main();