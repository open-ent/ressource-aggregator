import { useEffect, useState } from "react";

import { odeServices } from "@open-ent/client";

/**
 * Blob de la miniature à envoyer. Un fichier choisi par l'utilisateur est utilisé tel quel : le relire
 * par `fetch(blob:…)` est refusé par la politique CSP `connect-src` de la plateforme (la création de
 * signet échouait alors sans rien enregistrer). Seule une URL existante est téléchargée.
 */
export async function resolveCoverBlob(
  cover: string | Blob | File,
  download: (url: string) => Promise<Blob>,
): Promise<Blob> {
  if (typeof cover === "string") return cover ? download(cover) : new Blob();
  return cover ?? new Blob();
}

export default function useImageHandler(initialCover: string | Blob | File) {
  const [cover, setCover] = useState<string | Blob | File>(initialCover);

  useEffect(() => {
    setCover(initialCover);
  }, [initialCover]);

  const handleUploadImage = (file: File) => setCover(file);

  const handleDeleteImage = () => setCover("");

  const fetchUrl = async (): Promise<string> => {
    const blob = await resolveCoverBlob(cover, (url) =>
      odeServices.http().get(url, { responseType: "blob" }),
    );

    const response = await odeServices.workspace().saveFile(blob, {
      visibility: "protected",
      application: "media-library",
    });

    return (
      "/workspace/document/" +
      (response._id != null ? response._id : "undefined")
    );
  };

  return {
    cover,
    handleUploadImage,
    handleDeleteImage,
    fetchUrl,
  };
}
