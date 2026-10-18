import { describe, expect, it } from "vitest";

import { addFavoriteUrl, removeFavoriteUrl, searchUrl, textbooksUrl } from "./queryString";

describe("URL d'API", () => {
  it("une recherche avec & et # reste un seul paramètre jsondata", () => {
    const url = new URL(
      "http://x/" + searchUrl("s1", { data: { query: "maths & physique #3 c++" } }),
    );
    expect(url.searchParams.get("structureIds")).toBe("s1");
    expect(JSON.parse(url.searchParams.get("jsondata")!).data.query).toBe("maths & physique #3 c++");
    expect([...url.searchParams.keys()]).toEqual(["structureIds", "jsondata"]);
  });
  it("identifiants spéciaux encodés", () => {
    expect(textbooksUrl("a b&c")).toBe("textbooks/refresh?structureIds=a%20b%26c");
    expect(addFavoriteUrl("id#1")).toBe("favorites?id=id%231");
    expect(removeFavoriteUrl("1", "fr.openent&x")).toBe("favorites?id=1&source=fr.openent%26x");
  });
  it("valeurs absentes : paramètre vide, pas « undefined »", () => {
    expect(textbooksUrl(undefined)).toBe("textbooks/refresh?structureIds=");
  });
});
