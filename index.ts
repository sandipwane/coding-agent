import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client
// Bun automatically loads .env, so ANTHROPIC_API_KEY will be read from .env file
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  console.log("Starting Anthropic SDK example...\n");

  try {
    // Create a message using Claude
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "Hello! Can you explain what you are in one sentence?",
        },
      ],
    });

    console.log("Response from Claude:");
    console.log("---");

    // Extract and display the text content
    const textContent = message.content.find((block) => block.type === "text");
    if (textContent && textContent.type === "text") {
      console.log(textContent.text);
    }

    console.log("---\n");
    console.log("Message ID:", message.id);
    console.log("Model:", message.model);
    console.log("Usage:", message.usage);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("An unknown error occurred");
    }
  }
}

main();
