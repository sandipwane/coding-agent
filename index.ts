import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { streamText } from "ai";
import type { ModelMessage } from "ai";
import * as readline from "node:readline";

const GOODBYE_MESSAGE = "Goodbye! Have a nice day!";

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
  console.log(`${GOODBYE_MESSAGE}`);
  rl.close();
  process.exit(0);
};

process.on("beforeExit", handleExit);

async function main() {
  console.log("\n"+"Claude CLI v0.1");
  console.log("------------------------------------------------");
  console.log("Type your questions and press Enter to chat.");
  console.log("Type 'exit' or 'quit' to leave the chat.");
  console.log("");

  const conversationHistory: ModelMessage[] = [];

  while (true) {
    try {
      const userMessage = await getUserInput("> ");

      // Check for exit commands
      const input = userMessage.trim().toLowerCase();
      if (input === "exit" || input === "quit") {
        handleExit();
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
      process.stdout.write("✶ ");

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