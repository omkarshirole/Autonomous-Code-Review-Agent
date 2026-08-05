/**
 * Source Import Tests for ReviewPilot
 * Tests GitHub and ZIP source import functionality
 */

import { describe, it, expect, vi } from "vitest";
import { importGitHubSource, importZipSource } from "../server/sources.js";

describe("Source Imports", () => {
  describe("GitHub Import", () => {
    it("should have importGitHubSource function exported", () => {
      expect(typeof importGitHubSource).toBe("function");
    });

    it("should handle invalid GitHub URLs gracefully", async () => {
      // This will fail without network, but should not throw
      await expect(
        importGitHubSource("https://invalid-url-that-does-not-exist.com")
      ).rejects.toBeDefined();
    });
  });

  describe("ZIP Import", () => {
    it("should have importZipSource function exported", () => {
      expect(typeof importZipSource).toBe("function");
    });

    it("should handle empty buffer", async () => {
      await expect(importZipSource(Buffer.from(""), "empty.zip")).rejects.toBeDefined();
    });

    it("should handle non-ZIP buffer", async () => {
      await expect(
        importZipSource(Buffer.from("not a zip file"), "test.txt")
      ).rejects.toBeDefined();
    });
  });
});
