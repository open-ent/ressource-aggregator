import { describe, expect, it } from "vitest";

import { shouldSurfaceError } from "./emptySplitApi.service";

describe("shouldSurfaceError", () => {
  it("une écriture en échec est toujours remontée", () => {
    expect(shouldSurfaceError({ url: "favorites?id=1", method: "POST" })).toBe(true);
    expect(shouldSurfaceError({ url: "signets/1", method: "delete" })).toBe(true);
  });
  it("une lecture reste repliée sur une liste vide, sauf option surfaceErrors", () => {
    expect(shouldSurfaceError("levels")).toBe(false);
    expect(shouldSurfaceError({ url: "favorites" })).toBe(false);
    expect(shouldSurfaceError({ url: "search?x" }, { surfaceErrors: true })).toBe(true);
  });
});
