import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { streamText } from "ai";
import type { ModelMessage } from "ai";
import * as readline from "node:readline";

type EndPrompt = "exit" | "quit";
const END_PROMPTS: readonly EndPrompt[] = ["exit", "quit"];

// Initialize Bedrock with Vercel AI SDK
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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

async function main() {
  console.log("claude-cli v0.1");
  console.log("------------------------------------------------");
  console.log("Claude: ready. Type your questions and press Enter to chat.");
  console.log("");

  const conversationHistory: ModelMessage[] = [];

  while (true) {
    try {
      const userMessage = await getUserInput("$ ");

      if (END_PROMPTS.includes(userMessage.trim().toLowerCase() as EndPrompt)) {
        console.log("");
        console.log("Goodbye! Ending conversation.");
        console.log("");
        break;
      }

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
      process.stdout.write("> ");

      let fullResponse = "";
      const result = await streamText({
        model: bedrock("anthropic.claude-3-5-sonnet-20240620-v1:0"),
        messages: conversationHistory,
      });

      // Stream the response to console as it arrives
      for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
        fullResponse += textPart;
      }

      // Store assistant's response in history
      conversationHistory.push({
        role: "assistant",
        content: fullResponse,
      });

      console.log("\n");
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