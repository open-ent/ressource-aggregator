import { describe, expect, it } from "vitest";

import {
  EMPTY_GLOBAL_FORM,
  featuredPayload,
  formFromGlobal,
  globalPayload,
  isWebLink,
  validateFeaturedForm,
  validateGlobalForm,
} from "./adminResource.util";

describe("ressource globale", () => {
  const ok = { ...EMPTY_GLOBAL_FORM, title: "Lumni", link: "https://www.lumni.fr", profiles: ["STUDENT" as const] };

  it("formulaire vide : titre, lien et profil à corriger", () => {
    expect(validateGlobalForm(EMPTY_GLOBAL_FORM)).toEqual(["title", "link", "profiles"]);
  });
  it("un formulaire complet est valide", () => {
    expect(validateGlobalForm(ok)).toEqual([]);
  });
  it("le lien doit être une adresse web absolue", () => {
    expect(isWebLink("https://a.fr/x")).toBe(true);
    expect(isWebLink("javascript:alert(1)")).toBe(false);
    expect(isWebLink("www.lumni.fr")).toBe(false);
  });
  it("l'image est facultative mais doit être une adresse ou un chemin du serveur", () => {
    expect(validateGlobalForm({ ...ok, image: "/workspace/document/1" })).toEqual([]);
    expect(validateGlobalForm({ ...ok, image: "n'importe quoi" })).toEqual(["image"]);
  });
  it("le corps découpe auteurs et éditeurs et nettoie les espaces", () => {
    const p = globalPayload({ ...ok, title: "  Lumni ", authors: "A, B ,, C", editors: "" });
    expect(p).toMatchObject({ title: "Lumni", authors: ["A", "B", "C"], editors: [], profiles: ["STUDENT"] });
  });
  it("la modification reprend la ressource existante", () => {
    const f = formFromGlobal({ title: "T", link: "https://x.fr", authors: ["A", "B"], profiles: ["TEACHER", "INCONNU"] });
    expect(f).toMatchObject({ title: "T", authors: "A, B", profiles: ["TEACHER"] });
  });
});

describe("ressource mise en avant", () => {
  it("identifiant et source obligatoires", () => {
    expect(validateFeaturedForm({ resourceId: " ", source: "", module: "", description: "" })).toEqual(["resourceId", "source"]);
  });
  it("le corps est une liste d'un élément, sans champ vide", () => {
    expect(featuredPayload({ resourceId: " r1 ", source: "GAR", module: "", description: "Note" })).toEqual([
      { resourceId: "r1", source: "GAR", description: "Note" },
    ]);
  });
});
