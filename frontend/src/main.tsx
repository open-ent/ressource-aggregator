import React from "react";

import { EdificeClientProvider, EdificeThemeProvider } from "@edifice.io/react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import "~/i18n";

import "@edifice.io/bootstrap/dist/index.css";
import { AlertProvider } from "./providers/AlertProvider";
import { GlobalProvider } from "./providers/GlobalProvider";
import { ModalProvider } from "./providers/ModalsProvider";
import { PinProvider } from "./providers/PinProvider";
import { SelectedStructureProvider } from "./providers/SelectedStructureProvider";
import { ToasterProvider } from "./providers/ToasterProvider";
import { router } from "./routes";
import { setupStore } from "./store";
import {
  DATA_IS_PIN_HIGHTLIGHT,
  DATA_TEXT_PIN_HIGHTLIGHT,
} from "./core/const/config";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line global-require
  import("@axe-core/react").then((axe) => {
    axe.default(React, root, 1000);
  });
}

const isPinHightlight =
  rootElement?.getAttribute(DATA_IS_PIN_HIGHTLIGHT) === "true";

const textPinHightlight =
  rootElement?.getAttribute(DATA_TEXT_PIN_HIGHTLIGHT) ?? "";

const store = setupStore();

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      if (error === "0090") window.location.replace("/auth/login");
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

root.render(
  <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <EdificeClientProvider
        params={{
          app: "mediacentre",
        }}
      >
        <EdificeThemeProvider>
          <GlobalProvider
            isPinHightlight={isPinHightlight}
            textPinHightlight={textPinHightlight}
          >
            <SelectedStructureProvider>
              <AlertProvider>
                <PinProvider>
                  <ToasterProvider>
                    <ModalProvider>
                      <RouterProvider router={router} />
                    </ModalProvider>
                  </ToasterProvider>
                </PinProvider>
              </AlertProvider>
            </SelectedStructureProvider>
          </GlobalProvider>
        </EdificeThemeProvider>
      </EdificeClientProvider>
    </Provider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);
