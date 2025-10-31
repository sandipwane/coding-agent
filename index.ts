import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import * as readline from "node:readline";

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
  console.log("claude-cli v0.1 ");
  console.log("------------------------------------------------");
  console.log("Claude: ready. Type your questions and press Enter to chat.");
  console.log("");

  // Store conversation history
  const conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  // Main conversation loop
  while (true) {
    try {
      // Get user input
      const userMessage = await getUserInput("$ ");

      // Check if user wants to exit
      if (
        userMessage.trim().toLowerCase() === "exit" ||
        userMessage.trim().toLowerCase() === "quit"
      ) {
        console.log("");
        console.log("Goodbye! Ending conversation.");
        console.log("");
        break;
      }

      // Skip empty messages, when user presses Enter
      if (userMessage.trim() === "") {
        continue;
      }

      // Add user message to history
      conversationHistory.push({
        role: "user",
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

        // Display the response
        console.log("")
        console.log("> ", assistantResponse);

        // Add assistant's response to history
        conversationHistory.push({
          role: "assistant",
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
