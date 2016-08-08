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
 * @param callback function(exitCode)
 */
exports.setupCleanupCallback = function (callback) {
    // http://stackoverflow.com/a/21947851
    /* eslint-disable no-process-exit */

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

        try {
            process.send({uncaughtException: e.stack});
        }
        catch(e) {
            // process.send might fail when IPC pipe is closed.
            // Just ignore it - we've already logged that exception anyway.
        }

        process.exit(99);
    });

    // This event listener is required in order to be notified when
    // a parent process dies. However it causes the event loop to never end,
    // so make sure to explicitly call process.exit(0) in the child process
    // if you need to exit.
    process.on('disconnect', function () {
        logger.error("IPC channel disconnected");

        process.exit(1);
    });

    /* eslint-enable no-process-exit */

    // todo is this necessary?
    // process.stdin.on('error', process.exit);
    // process.stdin.on('end', process.exit);
    // process.stdout.on('error', process.exit);
    // process.stdout.on('end', process.exit);

};



