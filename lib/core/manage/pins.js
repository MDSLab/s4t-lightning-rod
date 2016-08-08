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

var logger = require('../../utils/log4js-wrapper').getLogger("manage pins");
var Board = require('../board');


function readDigital(args) {
    try {
        var pin = args[2];
        return Board.getState().getDevice().readDigital(pin)
            .catch(function (err) {
                return err.message;
            });
    } catch (ex) {
        return ex.message;
    }
}

function writeDigital(args) {
    try {
        var pin = args[2];
        var value = parseInt(args[3], 10);

        Board.getState().getDevice().writeDigital(pin, value)
            .done();
        logger.info("Set PIN " + pin + " to " + value);
        return 0;
    } catch (ex) {
        return ex.message;
    }
}

function readAnalog(args) {
    try {
        var pin = args[2];
        return Board.getState().getDevice().readAnalog(pin)
            .catch(function (err) {
                return err.message;
            });
    } catch (ex) {
        return ex.message;
    }
}

function writeAnalog(args) {
    try {
        var pin = args[2];
        var value = parseInt(args[3], 10);
        Board.getState().getDevice().writeAnalog(pin, value)
            .done();
        return 0;
    } catch (ex) {
        return ex.message;
    }
}

function setMode(args) {
    try {
        var pin = args[0];
        var mode = args[1];

        // todo is it OK that 'pwm' and 'servo' modes will be unknown? (though linino has them)
        Board.getState().getDevice().setMode(pin, mode)
            .done();
        return 0;
    } catch (ex) {
        return ex.message;
    }
}


/**
 * Exports procedures and subscribes to topics for the session
 * @param session {BaseWAMPSession}
 */
module.exports = function (session) {

    var boardCode = Board.getState().getBoardCode();

    //Register all the module functions as WAMP RPCs
    session.register(boardCode + '.command.rpc.setmode', setMode);
    session.register(boardCode + '.command.rpc.read.digital', readDigital);
    session.register(boardCode + '.command.rpc.write.digital', writeDigital);
    session.register(boardCode + '.command.rpc.read.analog', readAnalog);
    session.register(boardCode + '.command.rpc.write.analog', writeAnalog);

    logger.info('[WAMP-EXPORTS] Pins exported to the cloud!');
};
