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


var logger = require('../../utils/log4js-wrapper').getLogger("process utils");


var exports = module.exports = {};


/**
 * Sets up the `callback` to be executed on process exit
 *
 * @param callback function(exit_code)
 */
exports.setupCleanupCallback = function (callback) {
    // http://stackoverflow.com/a/21947851

    process.on('exit', function (code) {
        callback(code);
    });

    process.on('SIGINT', function () {
        logger.error('SIGINT (Ctrl-C)...');

        process.exit(2);
    });

    process.on('uncaughtException', function(e) {
        logger.error('Uncaught Exception...');
        logger.error(e.stack);

        process.exit(99);
    });

    process.on('disconnect', function () {
        logger.error("IPC channel disconnected");

        process.exit(1);
    });

    // todo is this necessary?
    // process.stdin.on('error', process.exit);
    // process.stdin.on('end', process.exit);
    // process.stdout.on('error', process.exit);
    // process.stdout.on('end', process.exit);

};



