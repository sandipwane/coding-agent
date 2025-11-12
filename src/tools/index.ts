import FileOperations from "./file-operations";
import CommandExecution from "./command-execution";

/**
 * Tools
 * Consolidated collection of AI agent tools
 */
namespace Tools {
  export const collection = {
    read: FileOperations.read,
    write: FileOperations.write,
    bash: CommandExecution.bash,
  };
}

export default Tools;