import * as readline from "node:readline";

/**
 * Terminal
 * Helper functions for terminal interaction and user input handling
 */
namespace Terminal {
  export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  export function getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  export function handleExit(): void {
    console.log("Goodbye! Have a nice day!");
    rl.close();
    process.exit(0);
  }

  export function displayHeader(name: string, version: string): void {
    console.log("\n" + name + " v" + version);
    console.log("------------------------------------------------");
    console.log("Type your questions and press Enter to chat.");
    console.log("Press Ctrl+C to leave the chat.");
    console.log("");
  }
}

export default Terminal;