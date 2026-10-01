import assert from "node:assert/strict";
import { trimLinkedInPreviewUrl } from "../src/utils/linkedinPreviewUrl.ts";

// Exercise the actual preview helper using Node without extra test dependencies.
for (const [input, expected] of [
  ["https://example.com", "https://example.com"],
  ["https://example.com/", "https://example.com/"],
  ["https://example.com.,!?;:", "https://example.com"],
  ["https://example.com).", "https://example.com"],
  ["https://example.com]", "https://example.com"],
  ["https://example.com}", "https://example.com"],
  ["https://example.com/Function_(mathematics)", "https://example.com/Function_(mathematics)"],
  ["https://example.com/Function_(mathematics)).", "https://example.com/Function_(mathematics)"],
  ["https://example.com/((nested))", "https://example.com/((nested))"],
  ["https://example.com/((nested))).", "https://example.com/((nested))"],
  ["https://example.com/?items[]=1]", "https://example.com/?items[]=1"],
  ["https://example.com/{id}", "https://example.com/{id}"],
]) {
  assert.equal(trimLinkedInPreviewUrl(input), expected);
}

console.log("LinkedIn preview URL checks passed (12 cases).");
