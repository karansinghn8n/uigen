import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

test("shows 'Creating Card.jsx' for str_replace_editor with command create", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/components/Card.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
});

test("shows 'Editing App.jsx' for str_replace_editor with command str_replace", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/src/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Viewing index.ts' for str_replace_editor with command view", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "view", path: "/src/index.ts" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Viewing index.ts")).toBeDefined();
});

test("shows raw tool name for unknown tool", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "4",
        toolName: "some_unknown_tool",
        args: {},
        state: "result",
        result: "Done",
      }}
    />
  );

  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("renders spinner when state is not result", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "5",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/Button.tsx" },
        state: "call",
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("renders green dot and no spinner when state is result with result", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "6",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/Button.tsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
