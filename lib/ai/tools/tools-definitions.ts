import { type ToolName, toolNameSchema } from "../types";

export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  getWeather: {
    name: "getWeather",
    description: "Get the weather in a specific location",
    cost: 1,
  },
  createDocument: {
    name: "createDocument",
    description: "Create a new document",
    cost: 5,
  },
  updateDocument: {
    name: "updateDocument",
    description: "Update a document",
    cost: 5,
  },
  requestSuggestions: {
    name: "requestSuggestions",
    description: "Request suggestions for a document",
    cost: 1,
  },
  readDocument: {
    name: "readDocument",
    description: "Read the content of a document",
    cost: 1,
  },
  // reasonSearch: {
  //   name: 'reasonSearch',
  //   description: 'Search with reasoning',
  //   cost: 50,
  // },
  retrieve: {
    name: "retrieve",
    description: "Retrieve information from the web",
    cost: 1,
  },
  webSearch: {
    name: "webSearch",
    description: "Search the web",
    cost: 3,
  },
  stockChart: {
    name: "stockChart",
    description: "Get the stock chart for a specific stock",
    cost: 1,
  },
  codeInterpreter: {
    name: "codeInterpreter",
    description: "Interpret code in a virtual environment",
    cost: 10,
  },
  generateImage: {
    name: "generateImage",
    description: "Generate images from text descriptions",
    cost: 50,
  },
  deepResearch: {
    name: "deepResearch",
    description: "Research a topic",
    cost: 50,
  },
  semanticSearch: {
    name: "semanticSearch",
    description: "Semantic Search",
    cost: 3,
  },
  fileRetrieve: {
    name: "fileRetrieve",
    description: "File Retrieve",
    cost: 1,
  },
  leaveBalance: {
    name: "leaveBalance",
    description: "Check leave balances and projections",
    cost: 2,
  },
  benefitsInfo: {
    name: "benefitsInfo",
    description: "Query benefits and plan information",
    cost: 2,
  },
  hrCase: {
    name: "hrCase",
    description: "Create and manage HR support tickets",
    cost: 3,
  },
  teamAvailability: {
    name: "teamAvailability",
    description: "Team Availability & Approvals",
    cost: 3,
  },
  peopleSearch: {
    name: "peopleSearch",
    description: "People Search & Org Context",
    cost: 2,
  },
};

export const allTools = toolNameSchema.options;
export type ToolDefinition = {
  name: string;
  description: string;
  cost: number;
};
