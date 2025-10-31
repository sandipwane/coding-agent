import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

// Initialize the Anthropic Bedrock client
// Bun automatically loads .env, so AWS credentials will be read from .env file
const anthropic = new AnthropicBedrock({
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || "us-east-1",
});

async function main() {
  console.log("Starting Anthropic Bedrock SDK example...\n");

  try {
    // Create a message using Claude via AWS Bedrock
    const message = await anthropic.messages.create({
      model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
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
