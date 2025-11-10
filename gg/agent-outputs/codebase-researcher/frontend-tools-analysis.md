# Tools UI Rendering - Complete Analysis



**Research Date:** 2025-11-10

**Focus:** Frontend rendering of tool calls and results in AgentDune Chat



---



## Table of Contents



1. [Overview](#overview)

2. [Tool Rendering Architecture](#tool-rendering-architecture)

3. [Message Parts System](#message-parts-system)

4. [Tool UI Patterns](#tool-ui-patterns)

5. [Deep Dive: Semantic Search Tool](#deep-dive-semantic-search-tool)

6. [Chain of Thought Integration](#chain-of-thought-integration)

7. [Other Tool Examples](#other-tool-examples)

8. [How to Add New Tool UI](#how-to-add-new-tool-ui)



---



## Overview



AgentDune Chat implements a sophisticated tool rendering system that displays tool calls and results inline within chat messages. The system uses a **message parts architecture** where each message can contain multiple parts, including text, reasoning, and various tool invocations.



### Key Components



- **Message Parts Router** (`components/message-parts.tsx`) - Central dispatcher for rendering different part types

- **Tool-Specific Components** - Individual UI components for each tool type

- **Chain of Thought System** - Special UI container for reasoning and tool execution

- **State Management** - Two-state system (input-available, output-available) for loading and results



---



## Tool Rendering Architecture



### File Structure



```

components/

├── message-parts.tsx          # Main router for all message parts

├── message-chain-of-thought.tsx  # CoT container with tool integration

├── semantic-search-result.tsx # Semantic search tool UI

├── file-retrieve-result.tsx   # File retrieval tool UI

├── weather.tsx                # Weather tool UI

├── document.tsx               # Document creation/update tools

├── generated-image.tsx        # Image generation tool

├── code-interpreter-message.tsx  # Code execution tool

├── stock-chart-message.tsx    # Stock chart tool

└── ai-elements/

    └── chain-of-thought.tsx   # Base CoT UI components

```



### Core Rendering Flow



1. **Message Component** renders an assistant message

2. **MessageParts Component** receives message ID and renders all parts

3. **Part Type Router** determines which component to use based on `part.type`

4. **Tool Component** renders based on `part.state` (input-available or output-available)



---



## Message Parts System



### File: `components/message-parts.tsx`



This is the **central dispatcher** for all message part rendering.



#### Part Types



Each message part has a type that determines how it's rendered:



```typescript

// Tool types

- "tool-semanticSearch"      // Semantic search in documents

- "tool-fileRetrieve"        // Retrieve full document content

- "tool-getWeather"          // Weather information

- "tool-createDocument"      // Create artifact (code, text, etc.)

- "tool-updateDocument"      // Update existing artifact

- "tool-requestSuggestions"  // Request suggestions for document

- "tool-retrieve"            // Web retrieval (deprecated)

- "tool-readDocument"        // Read document

- "tool-stockChart"          // Stock chart generation

- "tool-codeInterpreter"     // Code execution

- "tool-generateImage"       // Image generation

- "tool-deepResearch"        // Deep research with artifacts

- "tool-webSearch"           // Web search



// Other types

- "text"                     // Text content

- "reasoning"                // Reasoning/thinking content

- "data-researchUpdate"      // Research progress updates

```



#### Tool State System



Every tool part has a `state` property:



```typescript

type ToolState = "input-available" | "output-available";

```



- **input-available**: Tool is being called, show loading UI

- **output-available**: Tool completed, show results



#### Example: Semantic Search Rendering



From `message-parts.tsx:473-491`:



```typescript

if (type === "tool-semanticSearch") {

  const { toolCallId, state } = part;

  if (state === "input-available") {

    const { input } = part;

    return (

      <div key={toolCallId}>

        <SemanticSearchResult input={input} state={state} />

      </div>

    );

  }

  if (state === "output-available") {

    const { input, output } = part;

    return (

      <div key={toolCallId}>

        <SemanticSearchResult input={input} output={output} state={state} />

      </div>

    );

  }

}

```



#### Chain of Thought Integration



From `message-parts.tsx:575-623`:



The system intelligently groups reasoning and certain tools (like semantic search) into a Chain of Thought UI:



```typescript

const groups = useMemo(() => {

  // Tools that should be integrated into Chain of Thought

  const cotTools = new Set<ChatMessage["parts"][number]["type"]>([

    "tool-semanticSearch",

  ]);



  // Find the first and last CoT-compatible parts

  let cotStart = -1;

  let cotEnd = -1;



  for (let i = 0; i < types.length; i++) {

    if (types[i] === "reasoning" || cotTools.has(types[i])) {

      if (cotStart === -1) cotStart = i;

      cotEnd = i;

    }

  }



  // Create unified CoT group

  if (cotStart !== -1) {

    // Add non-CoT parts before

    for (let i = 0; i < cotStart; i++) {

      result.push({ kind: types[i], index: i });

    }



    // Add unified CoT group

    result.push({

      kind: "chain-of-thought",

      startIndex: cotStart,

      endIndex: cotEnd,

    });



    // Add non-CoT parts after

    for (let i = cotEnd + 1; i < types.length; i++) {

      result.push({ kind: types[i], index: i });

    }

  }



  return result;

}, [types]);

```



---



## Tool UI Patterns



### Pattern 1: Simple Loading + Result



**Used by:** Weather, File Retrieve, Semantic Search



**Structure:**

```typescript

// Loading State

if (state === "input-available") {

  return (

    <div className="border border-blue-200 bg-blue-50 p-3">

      <Loader2 className="animate-spin" />

      <span>Loading message...</span>

    </div>

  );

}



// Result State

if (state === "output-available") {

  return (

    <div className="border p-3">

      {/* Render results */}

    </div>

  );

}

```



### Pattern 2: Input + Output with Args



**Used by:** Stock Chart, Code Interpreter, Image Generation



**Structure:**

```typescript

// Loading with input args shown

if (state === "input-available") {

  const { input } = part;

  return <ToolComponent args={input} result={null} />;

}



// Results with both args and output

if (state === "output-available") {

  const { input, output } = part;

  return <ToolComponent args={input} result={output} />;

}

```



### Pattern 3: Interactive Button



**Used by:** Document tools (create/update)



**Structure:**

```typescript

// Loading: Shows button with spinner

<button onClick={openArtifact}>

  <Icon />

  <span>Creating "{title}"</span>

  <LoaderIcon className="animate-spin" />

</button>



// Result: Shows clickable button to open artifact

<button onClick={openArtifact}>

  <Icon />

  <span>Created "{title}"</span>

</button>

```



---



## Deep Dive: Semantic Search Tool



The semantic search tool is the **reference implementation** for the document RAG system. It demonstrates best practices for tool UI rendering.



### Backend Definition



**File:** `lib/ai/tools/semantic-search.ts`



```typescript

export type SemanticSearchInput = {

  query: string;

  limit?: number;

};



export type SearchResultItem = {

  documentId: string;

  documentName: string;

  chunkContent: string;

  pageNumber: number | null;

  relevanceScore: number;

  blobUrl: string;

};



export type SemanticSearchOutput = {

  results: SearchResultItem[];

  totalResults: number;

};



export const semanticSearch = ({ dataStream }: SemanticSearchProps) =>

  tool({

    description: "Search the organization's document library using semantic similarity...",

    inputSchema: z.object({

      query: z.string().describe("The search query in natural language"),

      limit: z.number().min(1).max(20).optional(),

    }),

    execute: async ({ query, limit = 5 }) => {

      // Get vector store ID

      const vectorStoreId = await getVectorStoreId();



      // Search using OpenAI Vector Store API

      const searchResults = await searchVectorStore(vectorStoreId, query, limit);



      // Map results to our format

      const results: SearchResultItem[] = [];

      for (const result of searchResults.data) {

        const document = await getUploadedDocumentByOpenAIFileId(result.file_id);

        results.push({

          documentId: document.id,

          documentName: document.filename,

          chunkContent: result.content.map(c => c.text).join('\n'),

          pageNumber: null,

          relevanceScore: result.score,

          blobUrl: document.blobUrl,

        });

      }



      return { results, totalResults: results.length };

    },

  });

```



### Frontend UI Component



**File:** `components/semantic-search-result.tsx`



#### Full Component Analysis



```typescript

export function SemanticSearchResult({

  state,

  input,

  output,

}: SemanticSearchResultProps) {

  // STATE 1: Loading (input-available)

  if (state === "input-available") {

    return (

      <div className="flex items-center gap-2 rounded-lg border border-blue-200

                      bg-blue-50 p-3 text-blue-900 text-sm

                      dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">

        <Loader2 className="h-4 w-4 animate-spin" />

        <span>

          Searching for: <span className="font-medium">{input.query}</span>

          {input.limit && input.limit !== 5 && (

            <span className="ml-2 text-xs opacity-75">

              (limit: {input.limit})

            </span>

          )}

        </span>

      </div>

    );

  }



  // STATE 2: Results (output-available)

  if (state === "output-available" && output) {

    // ERROR STATE

    if ("error" in output) {

      return (

        <div className="rounded-lg border border-red-200 bg-red-50 p-3

                        text-red-900 text-sm

                        dark:border-red-800 dark:bg-red-950 dark:text-red-100">

          <p className="font-medium">Error searching documents</p>

          <p className="mt-1 text-xs opacity-90">{output.error}</p>

          <p className="mt-2 text-xs opacity-75">

            Try rephrasing your query or check if documents are available.

          </p>

        </div>

      );

    }



    // NO RESULTS STATE

    const { results, totalResults } = output;

    if (totalResults === 0) {

      return (

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3

                        text-gray-700 text-sm

                        dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">

          <p className="font-medium">No results found</p>

          <p className="mt-1 text-xs opacity-75">

            No relevant documents found for your query.

          </p>

        </div>

      );

    }



    // SUCCESS STATE WITH RESULTS

    return (

      <div className="space-y-3">

        {/* Results Count */}

        <div className="flex items-center gap-2 text-gray-700 text-sm

                        dark:text-gray-300">

          <span className="font-medium">

            Found {totalResults} result{totalResults !== 1 ? "s" : ""}

          </span>

        </div>



        {/* Results List */}

        <div className="space-y-2">

          {results.map((result, index) => (

            <Card

              className="overflow-hidden p-3 transition-colors

                         hover:bg-gray-50 dark:hover:bg-gray-900"

              key={`${result.documentId}-${index}`}

            >

              <div className="flex items-start justify-between gap-2">

                <div className="min-w-0 flex-1 space-y-1">

                  {/* Document Name and Page Number */}

                  <div className="flex items-center gap-2">

                    <p className="font-medium text-gray-900 text-sm

                                  dark:text-gray-100">

                      {result.documentName}

                    </p>

                    {result.pageNumber && (

                      <Badge className="text-xs" variant="outline">

                        p. {result.pageNumber}

                      </Badge>

                    )}

                  </div>



                  {/* Content Snippet */}

                  {result.chunkContent && (

                    <p className="line-clamp-3 break-words text-gray-600 text-xs

                                  dark:text-gray-400">

                      {result.chunkContent}

                    </p>

                  )}

                </div>



                {/* Result Index Badge */}

                <Badge className="shrink-0 text-xs" variant="secondary">

                  #{index + 1}

                </Badge>

              </div>

            </Card>

          ))}

        </div>

      </div>

    );

  }



  return null;

}

```



#### UI States Breakdown



1. **Loading State** (lines 23-37)

   - Blue border/background color scheme

   - Animated Loader2 spinner

   - Shows query text

   - Optional limit display



2. **Error State** (lines 42-52)

   - Red border/background color scheme

   - Error title and message

   - Helpful suggestion text



3. **No Results State** (lines 57-66)

   - Gray border/background color scheme

   - Informative message



4. **Success State** (lines 68-110)

   - Results count header

   - Card-based results list

   - Each card contains:

     - Document name (bold)

     - Page number badge (if available)

     - Content snippet (line-clamped to 3 lines)

     - Result index badge

   - Hover effects on cards



#### Styling Patterns



```css

/* Color-coded states */

Loading:  border-blue-200 bg-blue-50 text-blue-900

Error:    border-red-200 bg-red-50 text-red-900

Empty:    border-gray-200 bg-gray-50 text-gray-700

Success:  Cards with hover effects



/* Dark mode variants */

dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100



/* Typography hierarchy */

Title:   font-medium text-sm

Count:   font-medium text-sm

Content: text-xs line-clamp-3

Helper:  text-xs opacity-75

```



---



## Chain of Thought Integration



The semantic search tool is specially integrated into the Chain of Thought UI for a more cohesive thinking experience.



### Chain of Thought Components



**File:** `components/ai-elements/chain-of-thought.tsx`



Base components for building CoT UI:



```typescript

// Main container - collapsible

<ChainOfThought defaultOpen={isLoading}>

  <ChainOfThoughtHeader>Thinking...</ChainOfThoughtHeader>

  <ChainOfThoughtContent>

    {/* Steps go here */}

  </ChainOfThoughtContent>

</ChainOfThought>



// Individual step with icon and label

<ChainOfThoughtStep

  icon={SearchIcon}

  label="Searching documents"

  status="active"

>

  {/* Step content */}

</ChainOfThoughtStep>



// Search results container

<ChainOfThoughtSearchResults>

  <ChainOfThoughtSearchResult>

    {/* Individual result badge */}

  </ChainOfThoughtSearchResult>

</ChainOfThoughtSearchResults>

```



### Semantic Search in CoT



**File:** `components/message-chain-of-thought.tsx:119-202`



```typescript

const SemanticSearchStep = memo(function SemanticSearchStep({

  part,

  isActive,

}: {

  part: Extract<ChatMessage["parts"][number], { type: "tool-semanticSearch" }>;

  isActive: boolean;

}) {

  const { state, input } = part;



  // LOADING STATE

  if (state === "input-available") {

    return (

      <ChainOfThoughtStep

        icon={SearchIcon}

        label={`Searching for "${input.query}"`}

        status={isActive ? "active" : "complete"}

      />

    );

  }



  // RESULTS STATE

  if (state === "output-available") {

    const { output } = part;



    // Error

    if ("error" in output) {

      return (

        <ChainOfThoughtStep

          icon={SearchIcon}

          label={"Search failed"}

          status="complete"

        >

          <div className="text-red-500 text-sm">{output.error}</div>

        </ChainOfThoughtStep>

      );

    }



    const { results, totalResults } = output;



    // No results

    if (totalResults === 0) {

      return (

        <ChainOfThoughtStep

          icon={SearchIcon}

          label={`No results found for "${input.query}"`}

          status="complete"

        />

      );

    }



    // SUCCESS - Shows clickable document badges

    return (

      <ChainOfThoughtStep

        icon={SearchIcon}

        label={`Found ${totalResults} result${totalResults !== 1 ? "s" : ""}`}

        status="complete"

      >

        <ChainOfThoughtSearchResults className="flex-wrap gap-2">

          {results.map((result, idx) => (

            <a

              href={result.blobUrl}

              target="_blank"

              rel="noopener noreferrer"

              key={idx}

              className="no-underline"

            >

              <ChainOfThoughtSearchResult className="inline-flex h-8 max-w-[300px]

                                                      cursor-pointer items-center gap-1.5

                                                      px-3 py-1 text-xs

                                                      hover:bg-secondary/80">

                <FileTextIcon className="size-3.5 shrink-0" />

                <span className="min-w-0 truncate">{result.documentName}</span>

                {result.pageNumber && (

                  <span className="shrink-0 text-[10px] text-muted-foreground">

                    (p.{result.pageNumber})

                  </span>

                )}

              </ChainOfThoughtSearchResult>

            </a>

          ))}

        </ChainOfThoughtSearchResults>

      </ChainOfThoughtStep>

    );

  }



  return null;

});

```



### Key Features of CoT Integration



1. **Compact Display**: Results shown as small badges instead of full cards

2. **Clickable Links**: Each result badge links to the document blob URL

3. **Visual Hierarchy**: Icon + label + nested results

4. **Status Indicators**: Active spinner during search, checkmark when complete

5. **Grouped with Reasoning**: Semantic search appears alongside reasoning steps



---



## Other Tool Examples



### File Retrieve Tool



**File:** `components/file-retrieve-result.tsx`



Similar to semantic search but focuses on showing full document content:



```typescript

// SUCCESS STATE

return (

  <Card className="p-4">

    <div className="space-y-3">

      {/* Header with file icon */}

      <div className="flex items-start gap-3">

        <FileText className="h-5 w-5 text-green-600" />

        <div className="flex-1">

          <h3 className="font-medium">{documentName}</h3>

          <div className="flex gap-2 text-xs">

            <span>{formatBytes(fileSize)}</span>

            <span>•</span>

            <span>{pageCount} pages</span>

            <span>•</span>

            <span>{content.length.toLocaleString()} characters</span>

          </div>

        </div>

      </div>



      {/* Content Preview */}

      <div className="rounded-md bg-gray-50 p-3">

        <p className="font-medium text-xs">Content Preview:</p>

        <p className="mt-2 whitespace-pre-wrap text-xs">{preview}</p>

        {content.length > 500 && (

          <p className="mt-2 text-xs italic">

            Showing first 500 characters. Full content loaded into context.

          </p>

        )}

      </div>



      {/* Note */}

      <p className="text-xs">

        <span className="font-medium">Note:</span> The full document content

        has been loaded and is available for the AI to reference.

      </p>

    </div>

  </Card>

);

```



**Color Scheme:** Green (loading and success states)



### Weather Tool



**File:** `components/weather.tsx`



Highly visual card-based UI with day/night themes:



```typescript

return (

  <div className={cx(

    "flex flex-col gap-4 rounded-2xl p-4",

    { "bg-blue-400": isDay },

    { "bg-indigo-900": !isDay }

  )}>

    {/* Current Temperature */}

    <div className="flex items-center gap-2">

      <div className={cx(

        "size-10 rounded-full",

        { "bg-yellow-300": isDay },

        { "bg-indigo-100": !isDay }

      )} />

      <div className="text-4xl text-blue-50">

        {n(current.temperature_2m)}°C

      </div>

    </div>



    {/* Hourly Forecast */}

    <div className="flex justify-between">

      {displayTimes.map((time, index) => (

        <div className="flex flex-col items-center gap-1" key={time}>

          <div className="text-xs">{format(new Date(time), "ha")}</div>

          <div className="size-6 rounded-full" />

          <div className="text-sm">{n(displayTemperatures[index])}°</div>

        </div>

      ))}

    </div>

  </div>

);

```



### Document Tools (Create/Update)



**File:** `components/document.tsx`



Interactive button-based UI that opens artifacts:



```typescript

// LOADING STATE

function DocumentToolCall({ type, args }) {

  return (

    <button onClick={openArtifact}>

      <div className="flex gap-3">

        {type === "create" ? <FileIcon /> : <PencilEditIcon />}

        <div>{getActionText(type, "present")} "{args.title}"</div>

      </div>

      <LoaderIcon className="animate-spin" />

    </button>

  );

}



// RESULT STATE

function DocumentToolResult({ type, result }) {

  return (

    <button onClick={openArtifact}>

      {type === "create" ? <FileIcon /> : <PencilEditIcon />}

      <div>{getActionText(type, "past")} "{result.title}"</div>

    </button>

  );

}

```



**Interaction:** Clicking opens the artifact in a side panel



---



## How to Add New Tool UI



Follow these steps to add UI for a new tool:



### Step 1: Define Tool Types



Add types to your tool definition file:



```typescript

// lib/ai/tools/my-new-tool.ts



export type MyToolInput = {

  // Input parameters

  query: string;

  options?: SomeOptions;

};



export type MyToolOutput = {

  // Success output

  data: DataType[];

  metadata: Metadata;

} | {

  // Error output

  error: string;

};

```



### Step 2: Create UI Component



Create a new component file:



```typescript

// components/my-tool-result.tsx



"use client";



import { Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";

import type { MyToolInput, MyToolOutput } from "@/lib/ai/tools/my-new-tool";



type MyToolResultProps = {

  state: "input-available" | "output-available";

  input: MyToolInput;

  output?: MyToolOutput;

};



export function MyToolResult({ state, input, output }: MyToolResultProps) {

  // LOADING STATE

  if (state === "input-available") {

    return (

      <div className="flex items-center gap-2 rounded-lg border border-purple-200

                      bg-purple-50 p-3 text-purple-900 text-sm">

        <Loader2 className="h-4 w-4 animate-spin" />

        <span>Processing: {input.query}</span>

      </div>

    );

  }



  // RESULT STATE

  if (state === "output-available" && output) {

    // Error handling

    if ("error" in output) {

      return (

        <div className="rounded-lg border border-red-200 bg-red-50 p-3">

          <p className="font-medium">Error</p>

          <p className="text-xs">{output.error}</p>

        </div>

      );

    }



    // Success rendering

    return (

      <div className="space-y-3">

        <div className="font-medium text-sm">Results</div>

        {output.data.map((item, idx) => (

          <Card key={idx} className="p-3">

            {/* Render your data */}

          </Card>

        ))}

      </div>

    );

  }



  return null;

}

```



### Step 3: Add to Message Parts Router



Edit `components/message-parts.tsx`:



```typescript

// Import your component

import { MyToolResult } from "./my-tool-result";



// Add to PureMessagePart function

function PureMessagePart({ messageId, partIdx, isReadonly }) {

  const part = useMessagePartByPartIdx(messageId, partIdx);

  const { type } = part;



  // ... existing tool handlers ...



  // Add your tool handler

  if (type === "tool-myNewTool") {

    const { toolCallId, state } = part;

    if (state === "input-available") {

      const { input } = part;

      return (

        <div key={toolCallId}>

          <MyToolResult input={input} state={state} />

        </div>

      );

    }

    if (state === "output-available") {

      const { input, output } = part;

      return (

        <div key={toolCallId}>

          <MyToolResult input={input} output={output} state={state} />

        </div>

      );

    }

  }



  return null;

}

```



### Step 4: (Optional) Add to Chain of Thought



If your tool should appear in the Chain of Thought UI:



**Edit `components/message-parts.tsx:577-579`:**



```typescript

const cotTools = new Set<ChatMessage["parts"][number]["type"]>([

  "tool-semanticSearch",

  "tool-myNewTool",  // Add your tool

]);

```



**Edit `components/message-chain-of-thought.tsx`:**



```typescript

// Add a specialized CoT step component

const MyToolStep = memo(function MyToolStep({ part, isActive }) {

  const { state, input } = part;



  if (state === "input-available") {

    return (

      <ChainOfThoughtStep

        icon={YourIcon}

        label={`Processing: ${input.query}`}

        status={isActive ? "active" : "complete"}

      />

    );

  }



  if (state === "output-available") {

    const { output } = part;



    if ("error" in output) {

      return (

        <ChainOfThoughtStep icon={YourIcon} label="Failed" status="complete">

          <div className="text-red-500">{output.error}</div>

        </ChainOfThoughtStep>

      );

    }



    return (

      <ChainOfThoughtStep

        icon={YourIcon}

        label={`Found ${output.data.length} results`}

        status="complete"

      >

        {/* Compact results display */}

      </ChainOfThoughtStep>

    );

  }



  return null;

});



// Add to the main render function

function PureMessageChainOfThought({ messageId, startIdx, endIdx, isLoading }) {

  // ... existing code ...



  return (

    <ChainOfThought defaultOpen={isLoading}>

      <ChainOfThoughtHeader>{headerText}</ChainOfThoughtHeader>

      <ChainOfThoughtContent>

        {steps.map((step, index) => {

          const { part, status } = step;



          if (part.type === "reasoning") {

            return <ReasoningStepItem key={index} status={status} text={part.text} />;

          }



          if (part.type === "tool-semanticSearch") {

            return <SemanticSearchStep key={index} part={part} isActive={step.isActive} />;

          }



          // Add your tool

          if (part.type === "tool-myNewTool") {

            return <MyToolStep key={index} part={part} isActive={step.isActive} />;

          }



          return null;

        })}

      </ChainOfThoughtContent>

    </ChainOfThought>

  );

}

```



### Step 5: Add Type Definitions



Add the tool type to your type definitions (if not already done by backend):



```typescript

// lib/ai/types.ts



export type ChatMessage = {

  // ... existing types ...

  parts: Array<

    // ... existing part types ...

    | {

        type: "tool-myNewTool";

        toolCallId: string;

        state: "input-available";

        input: MyToolInput;

      }

    | {

        type: "tool-myNewTool";

        toolCallId: string;

        state: "output-available";

        input: MyToolInput;

        output: MyToolOutput;

      }

  >;

};

```



---



## UI Design Guidelines



### Color Coding by State



Use consistent color schemes for different states:



```typescript

// Loading states - use primary color

Loading:  border-blue-200 bg-blue-50 text-blue-900

          border-green-200 bg-green-50 text-green-900

          border-purple-200 bg-purple-50 text-purple-900



// Error states - always red

Error:    border-red-200 bg-red-50 text-red-900



// Empty/neutral states - gray

Empty:    border-gray-200 bg-gray-50 text-gray-700



// Dark mode - adjust opacity

dark:border-{color}-800 dark:bg-{color}-950 dark:text-{color}-100

```



### Typography Hierarchy



```css

Headers:        font-medium text-sm

Body text:      text-sm

Metadata:       text-xs

Helper text:    text-xs opacity-75

Error details:  text-xs opacity-90

```



### Spacing



```css

Card padding:   p-3 or p-4

Gap between:    gap-2 or gap-3

Vertical:       space-y-2 or space-y-3

```



### Interactive Elements



```css

Hover effects:  hover:bg-gray-50 dark:hover:bg-gray-900

Transitions:    transition-colors

Cursors:        cursor-pointer

```



### Loading Indicators



Always use `Loader2` from lucide-react with `animate-spin`:



```tsx

<Loader2 className="h-4 w-4 animate-spin" />

```



---



## Summary



### Key Takeaways



1. **Centralized Routing**: All tool rendering goes through `message-parts.tsx`

2. **Two-State System**: Tools have input-available (loading) and output-available (result) states

3. **Consistent Patterns**: Follow established color schemes and UI patterns

4. **Chain of Thought**: Certain tools integrate into CoT for better UX

5. **Type Safety**: Proper TypeScript types ensure correct rendering



### Reference Implementation



The **semantic search tool** is the best reference for implementing new tool UIs:



- `/home/user/agentdune-chat/components/semantic-search-result.tsx` - Standalone UI

- `/home/user/agentdune-chat/components/message-chain-of-thought.tsx:119-202` - CoT integration

- `/home/user/agentdune-chat/lib/ai/tools/semantic-search.ts` - Backend definition



### File Paths Quick Reference



```

Core System:

  components/message-parts.tsx                   # Main router

  components/message-chain-of-thought.tsx        # CoT container

  components/ai-elements/chain-of-thought.tsx    # CoT base components



Tool Components:

  components/semantic-search-result.tsx          # Semantic search

  components/file-retrieve-result.tsx            # File retrieval

  components/weather.tsx                         # Weather

  components/document.tsx                        # Documents

  components/generated-image.tsx                 # Images

  components/code-interpreter-message.tsx        # Code execution

  components/stock-chart-message.tsx             # Stock charts



Tool Definitions:

  lib/ai/tools/semantic-search.ts               # Semantic search

  lib/ai/tools/file-retrieve.ts                 # File retrieval

  lib/ai/tools/get-weather.ts                   # Weather

  lib/ai/tools/create-document.ts               # Documents

  lib/ai/tools/generate-image.ts                # Images

  lib/ai/tools/code-interpreter.ts              # Code execution

  lib/ai/tools/stock-chart.ts                   # Stock charts

```



---



**End of Analysis**