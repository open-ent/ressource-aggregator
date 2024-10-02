export const convertKeyWords = (keywords: any) =>
  typeof keywords === "string"
    ? keywords.split(" ").filter((word) => word.trim() != "")
    : Array.isArray(keywords) && typeof keywords[0] === "string"
    ? keywords.filter((word) => word.trim() != "")
    : Array.isArray(keywords) && Array.isArray(keywords[0])
    ? keywords.map(([, text]) => text).filter((word) => word.trim() != "")
    : [];

export const convertLevels = (levels: any) =>
  Array.isArray(levels) && typeof levels[0] === "string"
    ? levels
    : Array.isArray(levels) && Array.isArray(levels[0])
    ? levels.map(([, text]) => text)
    : [];

export const convertDisciplines = (discplines: any) =>
  Array.isArray(discplines) && typeof discplines[0] === "string"
    ? discplines
    : Array.isArray(discplines) && Array.isArray(discplines[0])
    ? discplines.map(([, text]) => text)
    : [];
