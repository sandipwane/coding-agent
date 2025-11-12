import Application from "./src/application";
import Terminal from "./src/terminal";

/**
 * Main Entry Point
 */
async function main() {
  // Set up exit handler
  process.on("SIGINT", Terminal.handleExit);

  // Start chat session
  await Application.run();
}

// Start the application
main();