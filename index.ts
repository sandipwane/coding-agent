import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import * as readline from "readline";

// Initialize the Anthropic Bedrock client
// Bun automatically loads .env, so AWS credentials will be read from .env file
const anthropic = new AnthropicBedrock({
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || "us-east-1",
});

// Create readline interface for user input
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
  console.log("================================================");
  console.log("  Interactive Chat with Claude via AWS Bedrock");
  console.log("================================================");
  console.log("");
  console.log("Type your message and press Enter to chat.");
  console.log("Type 'exit' or 'quit' to end the conversation.");
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
      const userMessage = await getUserInput("You: ");

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

      // Skip empty messages
      if (userMessage.trim() === "") {
        continue;
      }

      // Add user message to history
      conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Send message to Claude via Bedrock
      console.log("");

      const message = await anthropic.messages.create({
        model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
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
        console.log("Assistant:", assistantResponse);
        console.log("");

        // Add assistant's response to history
        conversationHistory.push({
          role: "assistant",
          content: assistantResponse,
        });
      }

      // Display token usage info
      console.log(
        `[Tokens: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out]`
      );
      console.log("");
    } catch (error) {
      if (error instanceof Error) {
        console.error("[Error]:", error.message);
      } else {
        console.error("[Error]: An unknown error occurred");
      }
      console.log("");
    }
  }

  rl.close();
}

main();
