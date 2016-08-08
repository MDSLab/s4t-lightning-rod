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


var logger = require('../../utils/log4js-wrapper').getLogger("manage networks");
var Board = require('../board');
var Socat = require('../socat');


function setSocatOnBoard(args) {
    logger.info("[NETWORK-MANAGER] - Network manager loaded!");

    //logger.info("Active flag status: " + active);

    var socatRes;

    // todo ?!?!?!
    //if(active){
    if (true) {  // eslint-disable-line no-constant-condition
        //logger.warn("FIRST NETWORK INITIALIZATION:");
        //active = false;

        //NEW-net
        var socatServerIp = args[0];
        var socatServerPort = args[1];
        var socatBoardIp = args[2];
        socatRes = Board.getState().getBoardCode()
            + " - Server:" + socatServerIp + ":" + socatServerPort
            + " - Board: " + socatBoardIp;

        logger.info("[NETWORK-MANAGER] - SOCAT PARAMETERS INJECTED: " + socatRes);

        //NEW-net
        return Socat.initNetwork(socatServerIp, socatServerPort, socatBoardIp)
            .then(function () {
                return socatRes;
            });

        //logger.debug("[NETWORK-MANAGER] - Network initialization called!");
    } else {
        socatRes = "Network of board " + Board.getState().getBoardCode()
            + " is already configured!";
        logger.warn("[NETWORK-MANAGER] - NETWORK RECOVERY --- NO NEED NETWORK INITIALIZATION!");
        return socatRes;
    }

}

/**
 * Exports procedures and subscribes to topics for the session
 * @param session {BaseWAMPSession}
 */
module.exports = function (session) {
    var boardCode = Board.getState().getBoardCode();

    session.register(boardCode + '.command.rpc.network.setSocatOnBoard', setSocatOnBoard);

    logger.info('[WAMP-EXPORTS] Network commands exported to the cloud!');
};
