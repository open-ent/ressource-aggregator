import { afterEach, describe, expect, it, vi } from "vitest";

import { duplicateResource } from "./duplicateResource";

afterEach(() => vi.unstubAllGlobals());

describe("duplicateResource", () => {
  it("true quand le serveur répond 2xx, avec POST et cookies", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    expect(await duplicateResource("/moodle/duplicate/1")).toBe(true);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", credentials: "same-origin" });
  });
  it("false sur un statut d'erreur", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await duplicateResource("/x")).toBe(false);
  });
  it("false (sans rejet) sur une panne réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("réseau")));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await duplicateResource("/x")).toBe(false);
  });
});
