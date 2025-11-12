import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

/**
 * Configuration
 * Centralized configuration for AWS services and application settings
 */
namespace Config {
  // Application settings
  export const name = "Coding Agent";
  export const version = "0.1";
  export const maxSteps = 25;

  // Model configuration
  export const model = Bun.env.BEDROCK_MODEL || "anthropic.claude-3-5-sonnet-20240620-v1:0";

  // AWS configuration
  export const AWS = {
    region: Bun.env.AWS_REGION || "us-east-1",
    accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY,
  };

  export const bedrock = createAmazonBedrock(AWS);
}

export default Config;