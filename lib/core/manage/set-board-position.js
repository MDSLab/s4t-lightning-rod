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

var logger = require('../../utils/log4js-wrapper').getLogger("manage set-board-position");
var Board = require('../board');


/**
 * RPC procedure BOARDCODE.command.setBoardPosition(board_position)
 * @param args
 * @returns {string}
 */
function setBoardPosition(args) {

    var boardPosition = args[0];

    logger.info("setBoardPosition: " + JSON.stringify(boardPosition));

    return Board.getState().setBoardPosition(boardPosition)
        .then(function() {
            return "Board configuration file updated!";
        });
}


/**
 * Exports procedures and subscribes to topics for the session
 * @param session {BaseWAMPSession}
 */
module.exports = function (session) {
    var boardCode = Board.getState().getBoardCode();

    session.register(boardCode + ".command.setBoardPosition", setBoardPosition);
};
