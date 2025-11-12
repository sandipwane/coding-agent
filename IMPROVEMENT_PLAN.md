# Agent Code Improvement Plan for "How to Write an LLM Harness" Tutorial

## Current State Analysis

### Strengths ✓
- **Single-file simplicity**: Perfect for teaching - readers see entire flow
- **Minimal dependencies**: Only 3 core packages (ai, @ai-sdk/amazon-bedrock, zod)
- **Real streaming**: Shows actual token-by-token output
- **Multi-step tool calling**: Demonstrates agentic loops (up to 25 steps)

### Weaknesses ✗
- No visual separation between code sections
- Limited error context for learners
- Missing inline documentation explaining WHY
- No examples directory for usage patterns
- Console logging inconsistency
- Missing essential tools (search, list, safety)

## Improvement Plan

### Phase 1: Code Organization (Foundation)

#### 1.1 Section Structure
```typescript
// ═══════════════════════════════════════════
// SECTION 1: IMPORTS & CONFIGURATION
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// SECTION 2: TOOL DEFINITIONS
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// SECTION 3: MAIN AGENT LOOP
// ═══════════════════════════════════════════
```

#### 1.2 Add Flow Diagram at Top
```typescript
/**
 * AGENT ARCHITECTURE FLOW
 * ═══════════════════════
 *
 * User Input
 *     ↓
 * [Conversation History]
 *     ↓
 * Claude LLM ←──────┐
 *     ↓             │
 * Response?         │
 *     ├─ Text → Display
 *     └─ Tool → Execute → Result ─┘
 *
 * The agent maintains context through conversation history
 * and can call tools multiple times before responding.
 */
```

### Phase 2: Essential Tool Additions

#### 2.1 List Tool (File Discovery)
```typescript
list: tool({
  description: "List files and directories",
  inputSchema: z.object({
    path: z.string().default("."),
    recursive: z.boolean().optional().describe("List recursively"),
  }),
  execute: async ({ path, recursive }) => {
    // Tutorial Note: Shows filesystem navigation pattern
    console.log(`\n\n [-] LIST: ${path}${recursive ? ' (recursive)' : ''}\n`);
    // Implementation here
  }
})
```

#### 2.2 Search Tool (Content Discovery)
```typescript
search: tool({
  description: "Search for text patterns in files",
  inputSchema: z.object({
    pattern: z.string().describe("Text or regex pattern to search"),
    path: z.string().optional().describe("Directory to search in"),
    filePattern: z.string().optional().describe("File name pattern (e.g., *.ts)"),
  }),
  execute: async ({ pattern, path, filePattern }) => {
    // Tutorial Note: Demonstrates grep-like functionality
    console.log(`\n\n [-] SEARCH: "${pattern}" in ${path || '.'}\n`);
    // Implementation using grep or native search
  }
})
```

#### 2.3 Confirm Tool (Safety Pattern)
```typescript
confirm: tool({
  description: "Request user confirmation for sensitive operations",
  inputSchema: z.object({
    action: z.string().describe("Action requiring confirmation"),
    details: z.string().optional().describe("Additional context"),
  }),
  execute: async ({ action, details }) => {
    // Tutorial Note: Human-in-the-loop pattern for safety
    console.log(`\n\n [!] CONFIRMATION REQUIRED\n`);
    console.log(`    Action: ${action}`);
    if (details) console.log(`    Details: ${details}`);

    const answer = await getUserInput("Proceed? (yes/no): ");
    return answer.toLowerCase() === 'yes' ? 'confirmed' : 'cancelled';
  }
})
```

### Phase 3: Tutorial Support Files

#### 3.1 Directory Structure
```
coding-agent/
├── index.ts              # Main implementation (enhanced)
├── examples/
│   ├── 01-simple-chat.ts    # Basic Q&A example
│   ├── 02-file-operations.ts # Tool usage demo
│   └── 03-multi-step.ts     # Complex workflow
├── docs/
│   ├── ARCHITECTURE.md      # Visual diagrams
│   └── TUTORIAL.md          # Step-by-step guide
├── .env.example             # Configuration template
└── package.json
```

#### 3.2 Example Files Content

**examples/01-simple-chat.ts**
```typescript
// Example 1: Basic conversation without tools
// Shows: Message history, streaming response
```

**examples/02-file-operations.ts**
```typescript
// Example 2: Reading and writing files
// Shows: Tool calling, error handling
```

**examples/03-multi-step.ts**
```typescript
// Example 3: Multi-step reasoning
// Shows: Complex workflows, tool chaining
```

### Phase 4: Code Improvements

#### 4.1 Consistent Logging Format
```typescript
// Unified logging interface
const log = {
  tool: (name: string, params: any) => {
    console.log(`\n╔═══ TOOL: ${name.toUpperCase()}`);
    console.log(`║ Params:`, JSON.stringify(params, null, 2));
    console.log(`╚═══════════════════════════════\n`);
  },
  result: (result: any) => {
    console.log(`\n✓ Result:`, result);
  },
  error: (error: any) => {
    console.log(`\n✗ Error:`, error);
  }
};
```

#### 4.2 Structured Tool Response
```typescript
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    tokensUsed?: number;
  };
}
```

#### 4.3 Enhanced Comments
```typescript
// AGENTIC LOOP EXPLAINED:
// Step 1: User provides natural language input
// Step 2: Input added to conversation history (maintains context)
// Step 3: Stream request to LLM with available tools
// Step 4: LLM may respond with text OR request tool usage
// Step 5: If tool requested, execute and feed result back to LLM
// Step 6: LLM processes tool result and may call more tools
// Step 7: Continue until LLM provides final text response
// Step 8: Save complete interaction to history for next turn

const result = streamText({
  model: bedrock("anthropic.claude-3-5-sonnet-20240620-v1:0"),
  messages: conversationHistory,  // Full context from all turns
  tools,                          // Available capabilities
  stopWhen: stepCountIs(25),      // Safety limit prevents infinite loops
});
```

### Phase 5: Safety & Best Practices

#### 5.1 Dangerous Command Detection
```typescript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,           // Recursive deletion from root
  /mkfs\./,                   // Filesystem formatting
  /dd\s+if=.*of=\/dev/,      // Direct disk write
  /:(){ :|:& };:/,           // Fork bomb
  />\/dev\/sda/,             // Direct disk access
];

const isDangerous = (command: string): boolean => {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
};

// In bash tool:
if (isDangerous(command)) {
  const confirmed = await tools.confirm.execute({
    action: "Execute potentially dangerous command",
    details: command
  });
  if (confirmed !== 'confirmed') {
    return { success: false, error: "Command cancelled by user" };
  }
}
```

#### 5.2 Token Counting Display
```typescript
// Add token estimation
const estimateTokens = (text: string): number => {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
};

// Display token usage
console.log(`\n📊 Tokens used: ~${estimateTokens(fullResponse)}`);
```

#### 5.3 Error Recovery
```typescript
try {
  // Tool execution
} catch (error) {
  // Graceful degradation
  if (error.code === 'ENOENT') {
    return {
      success: false,
      error: "File or directory not found",
      suggestion: "Use the 'list' tool to explore available files"
    };
  }
  // Rate limiting
  if (error.code === 'RATE_LIMIT') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return retry();
  }
  // Generic error
  return {
    success: false,
    error: error.message || "Unknown error occurred"
  };
}
```

## Blog Post Structure Recommendation

### Part 1: Foundation (Current Code)
- Why build an agent harness?
- Minimal working example
- Running your first agent

### Part 2: Understanding the Flow
- ASCII diagram of agent loop
- Step-by-step breakdown
- Message history explained

### Part 3: Tool Design
- Anatomy of a tool
- Schema design with Zod
- Return value patterns
- Exercise: Add a new tool

### Part 4: Safety & Production
- Dangerous operation detection
- User confirmation flows
- Error handling strategies
- Logging & observability

### Part 5: Advanced Patterns
- Multi-step reasoning
- Context management
- Tool chaining
- State persistence

## Implementation Priority

### Must Have (Before Tutorial)
1. ✅ Add comprehensive inline comments
2. ✅ Implement list and search tools
3. ✅ Add consistent logging format
4. ✅ Create at least one example file
5. ✅ Add dangerous command detection

### Nice to Have
1. ⭕ Confirm tool for safety
2. ⭕ Token counting display
3. ⭕ Full examples directory
4. ⭕ Architecture documentation

### Can Add Later
1. ⏳ Edit tool (in-place modifications)
2. ⏳ HTTP/fetch tool
3. ⏳ Memory/state persistence
4. ⏳ Browser automation

## Key Teaching Points to Emphasize

1. **The Agentic Loop**: How LLMs iterate with tool usage
2. **Context Accumulation**: Why conversation history matters
3. **Streaming vs Batch**: Real-time feedback importance
4. **Tool Design**: Schema validation and error handling
5. **Safety First**: Never trust user input or LLM commands
6. **Observability**: Log everything for debugging

## Code Comparison Examples for Blog

### Before (Unclear)
```typescript
for await (const textPart of result.fullStream) {
  if (textPart.type === 'text-delta') {
    process.stdout.write(textPart.text);
  }
}
```

### After (Educational)
```typescript
// Stream each token as it arrives from the LLM
// This provides real-time feedback to the user
for await (const textPart of result.fullStream) {
  // Each 'text-delta' is a partial response chunk
  if (textPart.type === 'text-delta') {
    process.stdout.write(textPart.text);  // Display immediately
    fullResponse += textPart.text;         // Accumulate for history
  }
  // Note: tool-call events are handled automatically by the SDK
}
```

## Final Notes

- Keep single-file approach for simplicity
- Add visual elements (diagrams, tables) throughout
- Include common pitfalls and solutions
- Provide exercises after each section
- Reference real-world use cases

This plan transforms your code from a working prototype into an educational masterpiece suitable for a comprehensive tutorial on building LLM agents.