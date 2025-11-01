import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { streamText, tool } from "ai";
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

      // Stream response from Claude via Bedrock
      console.log("");
      process.stdout.write("✶ ");

      let fullResponse = "";
      const result = await streamText({
        model: bedrock("anthropic.claude-3-5-sonnet-20240620-v1:0"),
        messages: conversationHistory,
        tools,
      });

      // Stream the response to console as it arrives
      for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
        fullResponse += textPart;
      }

      console.log("\n");

      // Wait for the response to get messages (includes tool calls and results)
      const response = await result.response;

      // Add all response messages to conversation history
      // response.messages includes assistant message with tool calls and tool results
      conversationHistory.push(...response.messages);

      // Show tool results to user if any
      const toolResults = await result.toolResults;
      if (toolResults && toolResults.length > 0) {
        console.log("[Tool executed successfully]");
        console.log("");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("[Error]:", error.message);
      } else {
        console.error("[Error]: An unknown error occurred");
      }
    }
  }

  rl.close();
}

main();