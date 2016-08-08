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

var logger = require('../../utils/log4js-wrapper').getLogger("manage plugins");
var Board = require('../board');
var Plugins = require('../plugins');


function run(args) {
    var pluginName = "" + args[0];
    var pluginConf = JSON.parse("" + (args[1] || ""));

    return Plugins.startAsynchronousPlugin(pluginName, pluginConf)
        .then(function () {
            return 'OK - Plugin running!';
        })
        .catch(function (err) {
            logger.error('[PLUGIN] --> Error while running plugin ' + pluginName + ': ' + err);
            return pluginName + ' plugin running failure: ' + err;
        });

}

function call(args) {
    var pluginName = "" + args[0];
    var pluginConf = JSON.parse("" + (args[1] || ""));

    return Plugins.callSynchronousPlugin(pluginName, pluginConf)
        .catch(function (err) {
            logger.error('[PLUGIN] --> Error while calling plugin ' + pluginName + ': ' + err);
            // todo fix ambiguity between call result and failure
            return pluginName + ' plugin calling failure: ' + err;
        });
}

function kill(args) {
    var pluginName = "" + args[0];

    logger.info('[PLUGIN] - Stop plugin RPC called for plugin ' + pluginName + ' plugin...');

    return Plugins.kill(pluginName)
        .then(function () {
            return 'OK - Plugin killed!';
        })
        .catch(function (err) {
            logger.error('[PLUGIN] --> Error while killing plugin ' + pluginName + ': ' + err);
            return pluginName + ' plugin killing failure: ' + err;
        });
}

function injectPlugin(args) {
    var pluginName = "" + args[0];
    var pluginJsCodeString = "" + args[1];

    // The autostart parameter is used to set the boot execution configuration of the plugin.
    var autostart = false;

    if (args[2]) {
        autostart = JSON.parse("" + args[2]) || false;
    }

    logger.info("[PLUGIN] - Injecting plugin RPC called for " + pluginName + " plugin...");
    logger.info("[PLUGIN] --> Parameters injected: { plugin_name : " + pluginName
        + ", autostart : " + autostart + " }");
    logger.debug("[PLUGIN] --> plugin code:\n\n\"" + pluginJsCodeString + "\"\n\n");

    return Plugins.injectPlugin(pluginName, pluginJsCodeString, autostart)
        .then(function () {
            logger.info("[PLUGIN] --> Plugin " + pluginName + " injected successfully!");
            return "Plugin injected successfully!";
        })
        .catch(function (err) {
            logger.error('[PLUGIN] --> Error while injecting plugin ' + pluginName + ': ' + err);
            return 'Error: ' + err;
        });
}


function removePlugin(args) {
    var pluginName = "" + args[0];

    logger.info("[PLUGIN] - Removing plugin RPC called for " + pluginName + " plugin...");

    return Plugins.removePlugin(pluginName)
        .then(function () {
            logger.info("[PLUGIN] --> " + pluginName + " - plugin completely removed from board!");
            return pluginName + " completely removed from board!";
        })
        .catch(function (err) {
            logger.error('[PLUGIN] --> Error while removing plugin '
                + pluginName + ' data: ' + err);
            return pluginName + ' plugin data deletion failure: ' + err;
        });
}


// function restartAllActivePlugins() {
//
//     logger.info('Restarting all the already scheduled plugins');
//
//     return Plugins.restartAllActivePlugins();
// }

/**
 * Exports procedures and subscribes to topics for the session
 * @param session {BaseWAMPSession}
 */
module.exports = function (session) {

    var boardCode = Board.getState().getBoardCode();

    //logger.info('Exporting plugin commands to the Cloud');

    //Register all the module functions as WAMP RPCs
    session.register(boardCode + '.command.rpc.plugin.run', run);
    session.register(boardCode + '.command.rpc.plugin.call', call);
    session.register(boardCode + '.command.rpc.plugin.kill', kill);

    // todo DEPRECATED method to restart all enabled plugins
    //session.register(boardCode + '.command.rpc.restartAllActivePlugins', restartAllActivePlugins);

    session.register(boardCode + '.command.rpc.injectplugin', injectPlugin);
    session.register(boardCode + '.command.rpc.removeplugin', removePlugin);

    logger.info('[WAMP-EXPORTS] Plugin commands exported to the cloud!');

};
