import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ConvertResult } from "./markdown.js";
import { removeImageDir, saveConvertResult } from "./markdown.js";

// ─── Helpers ─────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── saveConvertResult ──────────────────────────────────────

describe("saveConvertResult", () => {
  it("writes markdown file without images", () => {
    const result: ConvertResult = {
      markdown: "# Hello\n\nSome text.",
      images: new Map(),
    };

    saveConvertResult(tmpDir, "lit-1", result);

    const mdPath = path.join(tmpDir, "lit-1.md");
    expect(fs.existsSync(mdPath)).toBe(true);
    expect(fs.readFileSync(mdPath, "utf-8")).toBe("# Hello\n\nSome text.");

    // No image directory should be created
    expect(fs.existsSync(path.join(tmpDir, "lit-1"))).toBe(false);
  });

  it("saves images to <id>/ subdirectory and rewrites paths in markdown", () => {
    const imgData = Buffer.from("fake-png-data");
    const result: ConvertResult = {
      markdown: "# Paper\n\n![Figure 1](figure1.png)\n\nSome text with figure1.png reference.",
      images: new Map([["figure1.png", imgData]]),
    };

    saveConvertResult(tmpDir, "lit-2", result);

    // Markdown file should exist with rewritten image paths
    const mdContent = fs.readFileSync(path.join(tmpDir, "lit-2.md"), "utf-8");
    expect(mdContent).toContain("](lit-2/figure1.png)");
    expect(mdContent).not.toContain("](figure1.png)");
    // Prose mentions of the filename should NOT be rewritten
    expect(mdContent).toContain("text with figure1.png reference");

    // Image file should exist in subdirectory
    const imgPath = path.join(tmpDir, "lit-2", "figure1.png");
    expect(fs.existsSync(imgPath)).toBe(true);
    expect(fs.readFileSync(imgPath)).toEqual(imgData);
  });

  it("handles multiple images", () => {
    const img1 = Buffer.from("img1");
    const img2 = Buffer.from("img2");
    const result: ConvertResult = {
      markdown: "![](fig1.png)\n![](fig2.jpg)",
      images: new Map([
        ["fig1.png", img1],
        ["fig2.jpg", img2],
      ]),
    };

    saveConvertResult(tmpDir, "lit-3", result);

    const mdContent = fs.readFileSync(path.join(tmpDir, "lit-3.md"), "utf-8");
    expect(mdContent).toBe("![](lit-3/fig1.png)\n![](lit-3/fig2.jpg)");

    expect(fs.readFileSync(path.join(tmpDir, "lit-3", "fig1.png"))).toEqual(img1);
    expect(fs.readFileSync(path.join(tmpDir, "lit-3", "fig2.jpg"))).toEqual(img2);

    expect(fs.existsSync(path.join(tmpDir, "lit-3", "fig1.png"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "lit-3", "fig2.jpg"))).toBe(true);
  });

  it("rewrites all occurrences of the same image filename", () => {
    const result: ConvertResult = {
      markdown: "![](logo.png) text ![](logo.png)",
      images: new Map([["logo.png", Buffer.from("x")]]),
    };

    saveConvertResult(tmpDir, "lit-4", result);

    const mdContent = fs.readFileSync(path.join(tmpDir, "lit-4.md"), "utf-8");
    expect(mdContent).toBe("![](lit-4/logo.png) text ![](lit-4/logo.png)");
  });

  it("does not rewrite filename in prose text, only in markdown link syntax", () => {
    const result: ConvertResult = {
      markdown: "See figure1.png for details. ![](figure1.png)",
      images: new Map([["figure1.png", Buffer.from("x")]]),
    };

    saveConvertResult(tmpDir, "lit-5", result);

    const mdContent = fs.readFileSync(path.join(tmpDir, "lit-5.md"), "utf-8");
    expect(mdContent).toBe("See figure1.png for details. ![](lit-5/figure1.png)");
  });
});

// ─── removeImageDir ─────────────────────────────────────────

describe("removeImageDir", () => {
  it("removes an existing image directory", () => {
    const imageDir = path.join(tmpDir, "lit-5");
    fs.mkdirSync(imageDir);
    fs.writeFileSync(path.join(imageDir, "img.png"), "data");

    removeImageDir(tmpDir, "lit-5");

    expect(fs.existsSync(imageDir)).toBe(false);
  });

  it("does nothing when image directory does not exist", () => {
    // Should not throw
    removeImageDir(tmpDir, "nonexistent");
  });
});
