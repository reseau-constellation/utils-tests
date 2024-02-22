import type { PartialOptions } from "aegir";
import type { BuildOptions } from "esbuild";

import { createRequire } from "module";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { lancerRelai } from "./sfip.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const esbuild: BuildOptions = {
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
    "electron",
    "env-paths",
    "@libp2p/tcp",
    "@libp2p/mdns",
  ],
};
type RetourAvant = {
  relai?: () => void;
};
export const configÆgir: PartialOptions = {
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
    config: esbuild,
  },
};
