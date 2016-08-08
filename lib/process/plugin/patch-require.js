/*
 *				 Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino,
 *      Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto, Kostya Esmukov
 *
 */
"use strict";


var Module = require('module');
var path = require('path');


var PLUGINAPI_IMPORT = 's4t-lightning-rod/lib/pluginapi';

/**
 * Monkey-patches `require` in user plugins.
 *
 * Aims for this:
 * 1. handle absolute imports of `s4t-lightning-rod/lib/pluginapi/...`
 * 2. filter modules, restricting some (probably harmful) from loading
 *
 * @param pluginApiDirectory
 * @constructor
 */
function PatchPluginRequire(pluginApiDirectory) {

    this._mockExtension = '.js';
    this._originalJsLoader = require.extensions[this._mockExtension];
    this._pluginApiDirectory = pluginApiDirectory;
}

/**
 * Applies patch
 */
PatchPluginRequire.prototype.patch = function () {

    require.extensions[this._mockExtension] = function (module, filename) {
        module.require = function (requirePath) {

            if (requirePath === "module") {
                // Snap out possibility of raw module loading,
                // bypassing the whitelist below
                throw new Error("This module is prohibited from loading");
            }

            // todo consider restricting (whitelisting?) modules
            // allowed to be required by plugins here

            if (requirePath.startsWith(PLUGINAPI_IMPORT)) {
                // replace with actual path for pluginapi dir in current setup

                var parts = PLUGINAPI_IMPORT.split('/').length;
                var fileInPluginapiDirectory = requirePath.split('/').slice(parts).join('/');
                requirePath = path.join(this._pluginApiDirectory, fileInPluginapiDirectory);
            }

            return Module._load(requirePath, module);
        }.bind(this);

        return this._originalJsLoader(module, filename);
    }.bind(this);
};

/**
 * Reverts patch
 */
PatchPluginRequire.prototype.unpatch = function () {
    require.extensions[this._mockExtension] = this._originalJsLoader;
};

module.exports = PatchPluginRequire;
