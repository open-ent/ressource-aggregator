import { useTranslation } from "react-i18next";
import "./EmptyState.scss";

interface EmptyStateProps {
  image?: string;
  title: string;
  description?: string;
  size?: "normal" | "big";
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  image = "empty-state.png",
  size = "normal",
  title,
  description,
}) => {
  const { t } = useTranslation("mediacentre");
  return (
    <div className={`empty-state ${size}`}>
      <img
        src={`/mediacentre/public/img/${image}`}
        alt="empty-state"
        className="empty-state-img"
      />
      <span className="empty-state-text">
        {<p>{t(title)}</p>}
        {description && <p>{t(description)}</p>}
      </span>
    </div>
  );
};
