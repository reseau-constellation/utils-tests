import type { PartialOptions } from "aegir";
import type { BuildOptions } from "esbuild";

import { lancerRelai } from "./sfip.js";

export const obtConfigEsbuild = async (): Promise<BuildOptions> => {
  const { createRequire } = (await import("module")).default;
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const require = createRequire(import.meta.url);
  const configEsbuild: BuildOptions = {
    // this will inject all the named exports from 'node-globals.js' as globals
    inject: [path.join(__dirname, "./scripts/node-globals.js")],
    plugins: [
      {
        name: "node built ins",
        setup(build) {
          build.onResolve({ filter: /^crypto$/ }, () => {
            return { path: require.resolve("crypto-browserify") };
          });
          build.onResolve({ filter: /^fs/ }, () => {
            return { path: require.resolve("browserify-fs") };
          });
          build.onResolve({ filter: /^stream$/ }, () => {
            return { path: require.resolve("stream-browserify") };
          });
          build.onResolve({ filter: /^os$/ }, () => {
            return { path: require.resolve("os-browserify") };
          });
          build.onResolve({ filter: /^node:process$/ }, () => {
            return { path: require.resolve("process/browser") };
          });
          build.onResolve({ filter: /^node:url$/ }, () => {
            return { path: require.resolve("url-polyfill") };
          });
        },
      },
    ],
    external: [
      "fs",
      "path",
      "os",
      "chokidar",
      "url",
      "execa",
      "zlib",
      "rimraf",
      "stream",
      "module",
      "electron",
      "env-paths",
      "@libp2p/tcp",
      "@libp2p/mdns",
    ],
  };
  return configEsbuild;
};

type RetourAvant = {
  relai?: () => void;
};

export const générerConfigÆgir = async (): Promise<PartialOptions> => {
  const esbuild = await obtConfigEsbuild();
  return {
    test: {
      // @ts-expect-error Erreur types Ægir
      before: async (opts): Promise<RetourAvant> => {
        let relai = undefined;
        if (opts.target.includes("browser")) {
          relai = await lancerRelai();
        }

        return { relai };
      },
      // @ts-expect-error Erreur types Ægir
      after: async (_opts, avant: RetourAvant) => {
        avant.relai?.();
      },
      browser: {
        config: {
          buildConfig: esbuild,
        },
      },
    },
    build: {
      // @ts-expect-error Erreur différentes versions esbuild et Ægir
      config: esbuild,
    },
  };
};
