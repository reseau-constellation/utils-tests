import { createRequire } from "module";

const require = createRequire(import.meta.url);

// https://github.com/node-webrtc/node-webrtc/issues/636#issuecomment-774171409
process.on("beforeExit", (code) => process.exit(code));

// https://github.com/ipfs/aegir/blob/master/md/migration-to-v31.md
const esbuild = {
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
  ],
};

/** @type {import('aegir').PartialOptions} */
const options = {
  test: {
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
