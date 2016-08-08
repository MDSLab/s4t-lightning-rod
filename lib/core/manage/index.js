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


var logger = require('./../../utils/log4js-wrapper').getLogger("Manage");


/**
 * Manage singleton
 */
var Manage = module.exports = {};


/**
 * Exports procedures and subscribes to topics for the session for each manage module
 *
 * @param session {BaseWAMPSession}
 */
Manage.exportAll = function (session) {
    /* eslint-disable global-require */
    require('./board-command')(session);
    require('./networks')(session);
    require('./pins')(session);
    require('./plugins')(session);
    require('./set-board-position')(session);
    /* eslint-enable global-require */

    logger.info('[WAMP-EXPORTS] Management commands exported to the cloud!');
};
