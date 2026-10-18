import { describe, expect, it } from "vitest";

import { assertMutationOk } from "./assertMutationOk";

describe("assertMutationOk", () => {
  it("laisse passer un succès", () => {
    expect(assertMutationOk({ data: { ok: true } })).toEqual({ data: { ok: true } });
  });
  it("lève quand la mutation renvoie une erreur", () => {
    expect(() => assertMutationOk({ error: { status: 500 } })).toThrow();
  });
  it("tolère une réponse vide", () => {
    expect(assertMutationOk(undefined)).toBeUndefined();
  });
});
