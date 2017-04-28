# Bundled distribution

## Introduction

That is a single JavaScript file which contains LR source code and the most of `node_modules` 
dependencies.

It is intended to deploy those bundles instead of full-blown source code and `node_modules` to 
the boards. This provides some benefits, like faster bootstraping (no need to do many filesystem 
lookups for loading CommonJS modules), less `node_modules` directory size on a board (which is 
significant on slow boards).

## Maintenance

Npm packages, requiring building binaries, must not be bundled, because shared libraries cannot be 
bundled to a JS.

See the `_noderify_lr` script in the `/package.json` for a complete list of such npm packages.

- `statvfs` - Platform-specific, contains binary objects. Not needed on Android. Must be 
installed manually.
- `mknod` - Platform-specific, contains binary objects. Not needed on Android. Must be 
installed manually.
- `fuse-bindings` - Platform-specific, contains binary objects. Not needed on Android. Must be 
installed manually.
- `ideino-linino-lib` - Arduino Yun specific - not needed on other boards. Must be installed 
manually.

So these non-bundled dependencies are still required to be installed on a board. For convenience,
they're listed in the `/package.dist.json` file. It it important to keep it in sync with the 
`/package.json`.

## Usage

- `npm install` - Installs all the required dependencies from the `/package.json` locally.
- `npm run build` - Builds a bundled distribution to the `/dist` folder with a bundle (`index.js`) 
and a `package.json` with all the non-bundled dependencies.
- Transfer the `/dist` directory to a board.
- `cd` to that directory on a board and run `npm install` to install non-bundled dependencies 
locally.
- Use `npm start` to launch the LR, or simply `node index.js`. 

## Used hacks

Noderify can't bundle dynamic imports. The libraries below use them. And here are the
solutions/hacks to prevent it, thus making these libraries bundle-able:

- `log4js`: dynamically requires appenders. The hack is in the `_build:log4js_workaround` script.
- `nconf`: loads store implementations as JS files on a file system. Fixed in a fork: 
https://github.com/KostyaEsmukov/nconf/commit/9ca067850615aa8668583d30deb80f0d6d395431
