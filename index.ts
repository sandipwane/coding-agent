import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import * as readline from "node:readline";

enum Role {
  User = "user",
  Assistant = "assistant",
}
type Message = { role: Role; content: string };
type EndPrompt = "exit" | "quit";
const END_PROMPTS: readonly EndPrompt[] = ["exit", "quit"];

const anthropic = new AnthropicBedrock({
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || "us-east-1",
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

  const conversationHistory: Message[] = [];

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
        role: Role.User,
        content: userMessage,
      });

      // Send message to Claude via Bedrock
      const message = await anthropic.messages.create({
        model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        max_tokens: 2048,
        messages: conversationHistory,
      });

      // Extract the assistant's response
      const textContent = message.content.find(
        (block) => block.type === "text"
      );
      if (textContent && textContent.type === "text") {
        const assistantResponse = textContent.text;

        // Print the response
        console.log("")
        console.log(">", assistantResponse);

        // Store assistant's response in history
        conversationHistory.push({
          role: Role.Assistant,
          content: assistantResponse,
        });
      }

      console.log("");
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
