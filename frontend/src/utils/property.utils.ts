import { STRING } from "~/core/const/typescript.const";

export const convertKeyWords = (keywords: any) =>
  typeof keywords === STRING
    ? keywords.split(" ").filter((word) => word.trim() != "")
    : Array.isArray(keywords) && typeof keywords[0] === STRING
    ? keywords.filter((word) => word.trim() != "")
    : Array.isArray(keywords) && Array.isArray(keywords[0])
    ? keywords.map(([, text]) => text).filter((word) => word.trim() != "")
    : [];

export const convertLevels = (levels: any) =>
  Array.isArray(levels) && !!levels.length && typeof levels[0] === STRING
    ? levels
    : Array.isArray(levels) && Array.isArray(levels[0])
    ? levels.map(([, text]) => text)
    : [];

export const convertDisciplines = (discplines: any) =>
  Array.isArray(discplines) &&
  !!discplines.length &&
  typeof discplines[0] === STRING
    ? discplines
    : Array.isArray(discplines) && Array.isArray(discplines[0])
    ? discplines.map(([, text]) => text)
    : [];
