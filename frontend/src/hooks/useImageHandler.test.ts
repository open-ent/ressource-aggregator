import { describe, expect, it, vi } from "vitest";

import { resolveCoverBlob } from "./useImageHandler";

describe("resolveCoverBlob", () => {
  it("un fichier choisi est utilisé tel quel, sans téléchargement (CSP blob:)", async () => {
    const download = vi.fn();
    const file = new File(["x"], "a.png", { type: "image/png" });
    expect(await resolveCoverBlob(file, download)).toBe(file);
    expect(download).not.toHaveBeenCalled();
  });
  it("une URL existante est téléchargée", async () => {
    const blob = new Blob(["y"]);
    const download = vi.fn().mockResolvedValue(blob);
    expect(await resolveCoverBlob("/workspace/document/1", download)).toBe(blob);
    expect(download).toHaveBeenCalledWith("/workspace/document/1");
  });
  it("aucune image : blob vide", async () => {
    expect((await resolveCoverBlob("", vi.fn())).size).toBe(0);
  });
});
