import { createRequire } from "module";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { $ } from "execa";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// https://github.com/node-webrtc/node-webrtc/issues/636#issuecomment-774171409
process.on("beforeExit", (code) => process.exit(code));

// https://github.com/ipfs/aegir/blob/master/md/migration-to-v31.md
const esbuild = {
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
        build.onResolve({ filter: /^node\:process$/ }, () => {
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
    "zlib",
    "rimraf",
    "stream",
    "electron",
    "env-paths",
    "@libp2p/tcp",
  ],
};

/** @type {import('aegir').PartialOptions} */
const options = {
  test: {
    before: async (opts) => {
      const relai = $`node test/utils/relai.js &`;
      return { relai };
    },
    after: async (_, avant) => {
      avant.relai.kill();
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

export default options;
