// https://github.com/node-webrtc/node-webrtc/issues/636#issuecomment-774171409
process.on("beforeExit", (code) => process.exit(code));

// https://github.com/ipfs/aegir/blob/master/md/migration-to-v31.md
const esbuild = {
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
