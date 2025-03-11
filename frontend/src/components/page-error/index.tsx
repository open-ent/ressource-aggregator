import { Box, Button, Stack, Typography } from "@cgi-learning-hub/ui";
import { Layout } from "@edifice.io/react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouteError } from "react-router-dom";
import { WarningSVG } from "../svg/warning";
import { PageErrorProps } from "./types";

export const PageError: FC<PageErrorProps> = ({ isNotFoundError = false }) => {
  const navigate = useNavigate();
  const { t } = useTranslation("mediacentre");
  const error = useRouteError();

  if (error) {
    console.error("an error has occured: " + error);
  }

  const handleGoToHome = () => {
    navigate("/");
  };

  return (
    <Layout>
      <Stack
        height="80vh"
        minHeight="fit-content"
        justifyContent="center"
        alignItems="center"
        spacing="2rem"
        margin="3rem"
      >
        <Box width="25rem">
          <WarningSVG />
        </Box>
        <Typography variant="body1" color="error" fontSize="2.4rem">
          {t("mediacentre.error.page.oops")}
        </Typography>
        <Typography variant="body2" fontSize="1.6rem">
          {isNotFoundError
            ? t("mediacentre.error.page.not.found")
            : t("mediacentre.error.page.an.error.occurred")}
        </Typography>
        <Button
          variant="contained"
          sx={{ fontSize: "1.6rem" }}
          onClick={handleGoToHome}
        >
          {t("mediacentre.error.page.back.to.home")}
        </Button>
      </Stack>
    </Layout>
  );
};
