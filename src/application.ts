import { streamText, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import Config from "./config";
import Terminal from "./terminal";
import Tools from "./tools";

/**
 * Application
 * Main chat session management using functional approach
 */
namespace Application {
  let conversationHistory: ModelMessage[] = [];

  export async function run(): Promise<void> {
    Terminal.displayHeader(Config.name, Config.version);

    while (true) {
      try {
        await processUserInput();
      } catch (error) {
        handleError(error);
      }
    }
  }

  async function processUserInput(): Promise<void> {
    const userMessage = await Terminal.getUserInput("> ");

    // Skip when user presses Enter
    if (userMessage.trim() === "") {
      return;
    }

    // Store user message in history
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Stream response from Claude
    await streamResponse();
  }

  async function streamResponse(): Promise<void> {
    console.log("");
    process.stdout.write("✶ ");

    let fullResponse = "";
    const result = streamText({
      model: Config.bedrock(Config.model),
      messages: conversationHistory,
      tools: Tools.collection,
      stopWhen: stepCountIs(Config.maxSteps),
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
  }

  function handleError(error: unknown): void {
    if (error instanceof Error) {
      console.error("[Error]:", error.message);
    } else {
      console.error("[Error]: An unknown error occurred");
    }
  }
}

export default Application;