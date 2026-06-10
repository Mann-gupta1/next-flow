import type { WorkflowEdge, WorkflowNode } from "./types";

const SAMPLE_TEXT = `Product: Wireless Bluetooth Headphones.
Features:
Noise cancellation,
30-hour battery,
foldable design.`;

export function createSampleWorkflowNodes(): WorkflowNode[] {
  return [
    {
      id: "request-inputs-1",
      type: "request-inputs",
      position: { x: 80, y: 280 },
      data: {
        label: "Request Inputs",
        fields: [
          {
            id: "field-text-1",
            name: "text_field",
            type: "text_field",
            value: SAMPLE_TEXT,
          },
          {
            id: "field-image-1",
            name: "image_field",
            type: "image_field",
            imageUrl: "",
            imageName: "",
          },
        ],
      },
      deletable: false,
    },
    {
      id: "crop-1",
      type: "crop-image",
      position: { x: 480, y: 80 },
      data: {
        label: "Crop Image #1",
        positionX: 20,
        positionY: 20,
        width: 60,
        height: 60,
      },
    },
    {
      id: "crop-2",
      type: "crop-image",
      position: { x: 480, y: 360 },
      data: {
        label: "Crop Image #2",
        positionX: 0,
        positionY: 0,
        width: 100,
        height: 50,
      },
    },
    {
      id: "gemini-1",
      type: "gemini",
      position: { x: 480, y: 620 },
      data: {
        label: "Gemini 3.1 Pro #1",
        model: "gemini-2.5-pro",
        systemPrompt:
          "You are a marketing copywriter.\nWrite a one-paragraph product description.",
        promptConnected: true,
      },
    },
    {
      id: "gemini-2",
      type: "gemini",
      position: { x: 900, y: 200 },
      data: {
        label: "Gemini 3.1 Pro #2",
        model: "gemini-2.5-pro",
        systemPrompt:
          "Condense the following product description into a tweet-length hook (under 240 characters).",
        promptConnected: true,
      },
    },
    {
      id: "gemini-3",
      type: "gemini",
      position: { x: 900, y: 520 },
      data: {
        label: "Gemini 3.1 Pro #3 (Final)",
        model: "gemini-2.5-pro",
        systemPrompt:
          "You are a social media manager.\nCombine the tweet hook and the two product crops into a final marketing post.",
        promptConnected: true,
        imageConnected: true,
      },
    },
    {
      id: "response-1",
      type: "response",
      position: { x: 1320, y: 520 },
      data: {
        label: "Response",
        resultConnected: true,
      },
      deletable: false,
    },
  ];
}

export function createSampleWorkflowEdges(): WorkflowEdge[] {
  return [
    {
      id: "e-ri-crop1",
      source: "request-inputs-1",
      target: "crop-1",
      sourceHandle: "image_field",
      targetHandle: "input-image",
      type: "animated",
    },
    {
      id: "e-ri-crop2",
      source: "request-inputs-1",
      target: "crop-2",
      sourceHandle: "image_field",
      targetHandle: "input-image",
      type: "animated",
    },
    {
      id: "e-ri-g1",
      source: "request-inputs-1",
      target: "gemini-1",
      sourceHandle: "text_field",
      targetHandle: "prompt",
      type: "animated",
    },
    {
      id: "e-g1-g2",
      source: "gemini-1",
      target: "gemini-2",
      sourceHandle: "response",
      targetHandle: "prompt",
      type: "animated",
    },
    {
      id: "e-crop1-final",
      source: "crop-1",
      target: "gemini-3",
      sourceHandle: "output-image",
      targetHandle: "image",
      type: "animated",
    },
    {
      id: "e-crop2-final",
      source: "crop-2",
      target: "gemini-3",
      sourceHandle: "output-image",
      targetHandle: "image",
      type: "animated",
    },
    {
      id: "e-g2-final",
      source: "gemini-2",
      target: "gemini-3",
      sourceHandle: "response",
      targetHandle: "prompt",
      type: "animated",
    },
    {
      id: "e-final-response",
      source: "gemini-3",
      target: "response-1",
      sourceHandle: "response",
      targetHandle: "result",
      type: "animated",
    },
  ];
}

export function createBlankWorkflowNodes(): WorkflowNode[] {
  return [
    {
      id: "request-inputs-1",
      type: "request-inputs",
      position: { x: 100, y: 300 },
      data: {
        label: "Request Inputs",
        fields: [
          {
            id: "field-text-1",
            name: "text_field",
            type: "text_field",
            value: "",  
          },
        ],
      },
      deletable: false,
    },
    {
      id: "response-1",
      type: "response",
      position: { x: 700, y: 300 },
      data: {
        label: "Response",
      },
      deletable: false,
    },
  ];
}
