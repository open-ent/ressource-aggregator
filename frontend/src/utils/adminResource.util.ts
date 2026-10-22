/**
 * Ressources globales et mises en avant : formulaires d'administration.
 * Logique pure (validation et corps des requêtes), testée à part de l'écran.
 */

/** Profils auxquels une ressource globale peut être destinée (valeurs du serveur). */
export const GLOBAL_PROFILES = ["STUDENT", "TEACHER", "RELATIVE", "PERSONNEL", "ADMIN"] as const;
export type GlobalProfile = (typeof GLOBAL_PROFILES)[number];

export interface GlobalResourceForm {
  title: string;
  link: string;
  image: string;
  /** Auteurs et éditeurs : saisis séparés par des virgules. */
  authors: string;
  editors: string;
  profiles: GlobalProfile[];
}

export const EMPTY_GLOBAL_FORM: GlobalResourceForm = {
  title: "",
  link: "",
  image: "",
  authors: "",
  editors: "",
  profiles: [],
};

const list = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** « Mathématiques, Histoire » → ["Mathématiques", "Histoire"]. */
export const splitList = list;

/** Un lien utilisable : adresse web absolue (http ou https). */
export function isWebLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type GlobalFormError = "title" | "link" | "image" | "profiles";

/** Champs à corriger avant enregistrement ; vide quand le formulaire est valide. */
export function validateGlobalForm(form: GlobalResourceForm): GlobalFormError[] {
  const errors: GlobalFormError[] = [];
  if (!form.title.trim()) errors.push("title");
  if (!isWebLink(form.link)) errors.push("link");
  if (form.image.trim() && !isWebLink(form.image) && !form.image.trim().startsWith("/")) errors.push("image");
  // Le serveur refuse une ressource sans profil (« Profiles can not empty »).
  if (form.profiles.length === 0) errors.push("profiles");
  return errors;
}

/** Corps de `POST/PUT /mediacentre/global/resources`. */
export function globalPayload(form: GlobalResourceForm) {
  return {
    title: form.title.trim(),
    link: form.link.trim(),
    image: form.image.trim(),
    authors: list(form.authors),
    editors: list(form.editors),
    profiles: form.profiles,
  };
}

/** Formulaire prérempli depuis une ressource existante (profils inconnus écartés). */
export function formFromGlobal(resource: {
  title?: string;
  link?: string;
  image?: string;
  authors?: string[];
  editors?: string[];
  profiles?: string[];
}): GlobalResourceForm {
  return {
    title: resource.title ?? "",
    link: resource.link ?? "",
    image: resource.image ?? "",
    authors: (resource.authors ?? []).join(", "),
    editors: (resource.editors ?? []).join(", "),
    profiles: (resource.profiles ?? []).filter((p): p is GlobalProfile => (GLOBAL_PROFILES as readonly string[]).includes(p)),
  };
}

export interface FeaturedForm {
  resourceId: string;
  source: string;
  module: string;
  description: string;
}

export const EMPTY_FEATURED_FORM: FeaturedForm = { resourceId: "", source: "", module: "", description: "" };

export type FeaturedFormError = "resourceId" | "source";

export function validateFeaturedForm(form: FeaturedForm): FeaturedFormError[] {
  const errors: FeaturedFormError[] = [];
  if (!form.resourceId.trim()) errors.push("resourceId");
  if (!form.source.trim()) errors.push("source");
  return errors;
}

/** Corps de `POST /mediacentre/featured` : le serveur attend une LISTE de ressources. */
export function featuredPayload(form: FeaturedForm) {
  return [
    {
      resourceId: form.resourceId.trim(),
      source: form.source.trim(),
      ...(form.module.trim() ? { module: form.module.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    },
  ];
}
