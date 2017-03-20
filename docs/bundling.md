# Bundled distribution

## Introduction

That is a single JavaScript file which contains LR source code and the most of `node_modules` 
dependencies.

It is intended to deploy those bundles instead of full-blown source code and `node_modules` to 
the boards. This provides some benefits, like faster bootstraping (no need to do many filesystem 
lookups for loading CommonJS modules), less `node_modules` directory size on a board (which is 
significant on slow boards).

## Maintenance

However, some npm packages cannot be bundled (see the `build:index.js` script in the 
`/package.json`), such as:

- `log4js` - loads appenders from a filesystem
- `nconf` - loads stores from a filesystem 
- `ideino-linino-lib` - Arduino Yun specific - not needed on other boards
- `node-reverse-wstunnel` - is used by LR as a program, not as a CommonJS module.

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
