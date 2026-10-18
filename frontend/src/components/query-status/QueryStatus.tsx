import { Alert, Button } from "@open-ent/react";
import { useTranslation } from "react-i18next";

interface QueryStatusProps {
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

/**
 * État d'une requête de liste : chargement ou échec avec « Réessayer ».
 * Sans lui, un 4xx/5xx se confondait avec « aucune ressource » (liste vide silencieuse).
 * Ne rend rien quand tout va bien : la page masque alors seulement son contenu pendant le chargement ou l'erreur.
 */
export const QueryStatus: React.FC<QueryStatusProps> = ({ isLoading, isError, onRetry }) => {
  const { t } = useTranslation("mediacentre");
  if (isLoading) {
    return (
      <p className="med-query-loading" role="status" data-query-loading>
        {t("mediacentre.loading")}
      </p>
    );
  }
  if (isError) {
    return (
      <div className="med-query-error" data-query-error>
        <Alert type="danger" isDismissible={false}>
          {t("mediacentre.error.load")}
        </Alert>
        {onRetry && (
          <Button type="button" color="secondary" variant="outline" onClick={onRetry}>
            {t("mediacentre.error.retry")}
          </Button>
        )}
      </div>
    );
  }
  return null;
};
