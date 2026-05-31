/// <reference types="vitest" />

import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  // Checking environement files
  const envFile = loadEnv(mode, process.cwd());
  const envs = { ...process.env, ...envFile };
  const hasEnvFile = Object.keys(envFile).length;

  // Proxy variables
  const headers = hasEnvFile
    ? {
        "set-cookie": [
          `oneSessionId=${envs.VITE_ONE_SESSION_ID}`,
          `XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        ],
        "Cache-Control": "public, max-age=300",
      }
    : {};

  const proxyObj = hasEnvFile
    ? {
        target: envs.VITE_RECETTE,
        changeOrigin: true,
        headers: {
          cookie: `oneSessionId=${envs.VITE_ONE_SESSION_ID};authenticated=true; XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        },
      }
    : {
        target: envs.VITE_LOCALHOST || "http://localhost:8090",
        changeOrigin: false,
      };

  const proxy = {
    "/applications-list": proxyObj,
    "/conf/public": proxyObj,
    "^/(?=help-1d|help-2d)": proxyObj,
    "^/(?=assets)": proxyObj,
    "^/(?=theme|locale|i18n|skin)": proxyObj,
    "^/(?=auth|appregistry|cas|userbook|directory|communication|conversation|portal|session|timeline|workspace|infra)":
      proxyObj,
    "/blog": proxyObj,
    "/explorer": proxyObj,
    "/mediacentre": proxyObj,
  };

  const base = mode === "production" ? "/mediacentre" : "";

  const build = {
    assetsDir: "public",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          react: [
            "react",
            "react-router-dom",
            "react-dom",
            "react-error-boundary",
            "react-hook-form",
            "react-hot-toast",
          ],
        },
      },
    },
  };

  // @cgi-learning-hub/ui est pré-bundlé (rolldown) en externalisant dayjs et react
  // via un `__require` qui jette dans le navigateur ("environment that doesn't expose require").
  // On remplace ces `__require("dayjs"|"react")` par de vrais imports ESM (en `pre`,
  // avant que rollup-commonjs ne renomme require -> commonjsRequire).
  const fixCgiExternalRequire = {
    name: "fix-cgi-external-require",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (
        !id.includes("@cgi-learning-hub/ui") ||
        !/__require\("(dayjs|react)"\)/.test(code)
      ) {
        return null;
      }
      const banner =
        'import __cgiDayjs from "dayjs";\nimport __cgiReact from "react";\n';
      const out = code
        .replace(/__require\("dayjs"\)/g, "__cgiDayjs")
        .replace(/__require\("react"\)/g, "__cgiReact");
      return { code: banner + out, map: null };
    },
  };

  const plugins = [fixCgiExternalRequire, react(), tsconfigPaths()];

  const server = {
    proxy,
    host: "0.0.0.0",
    port: 4200,
    headers,
    open: true,
    strictPort: true,
    fs: {
      allow: ["../../"],
    },
  };

  const test = {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/tests/setup.ts",
    server: {
      deps: {
        inline: ["@open-ent/react"],
      },
    },
  };

  return defineConfig({
    base,
    build,
    plugins,
    server,
    test,
    resolve: {
      alias: {
        "@cgi-learning-hub": resolve(
          __dirname,
          "node_modules/@cgi-learning-hub",
        ),
        "@images": resolve(
          __dirname,
          "node_modules/@open-ent/bootstrap/dist/images",
        ),
      },
      dedupe: [
        "react",
        "react-dom",
        "@tanstack/react-query",
        "react-i18next",
        "i18next",
        "@open-ent/client",
        "@open-ent/react",
        "@open-ent/bootstrap",
      ],
    },
  });
};
