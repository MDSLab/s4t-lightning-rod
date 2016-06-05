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


/**
 * Base class for plugins
 *
 * @constructor
 * @abstract
 */
function BasePlugin(pluginConf) {
    if (this.constructor === BasePlugin) {
        throw new Error("Can't instantiate abstract class!");
    }

}


module.exports = BasePlugin;