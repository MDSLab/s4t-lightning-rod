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


var logger = require('../../utils/log4js-wrapper').getLogger("manage commands");
var Board = require('../board');
var Reverse = require('../reverse');
var Network = require('../network');


function service(serviceName, remotePort, operation) {
    var localPort = Board.getState().getLocalPortForService(serviceName);
    var reverseTunnellingServer = Reverse.getState().getReverseTunnelingServer();

    logger.info('Activating operation ' + operation + ' to service '
        + serviceName + ' with remote port ' + remotePort
        + ' on local port ' + localPort
        + ' contacting remote server ' + reverseTunnellingServer);

    if (operation === "start") {
        // todo respect response
        Reverse.openTunnel(localPort, reverseTunnellingServer, remotePort)
            .done();
    }
    if (operation === "stop") {
        // todo respect response
        Reverse.closeTunnel(localPort)
            .done();
    }
}

function networks(command, commandArgs) {

    switch (command) {

        case 'add-to-network':
            (function () {
                var vlanID = commandArgs[0];
                var boardVlanIP = commandArgs[1];
                var vlanMask = commandArgs[2];
                var vlanName = commandArgs[3];

                // todo respect response
                Network.addToVlan(vlanID, boardVlanIP, vlanMask, vlanName)
                    .done();
            })();
            break;

        case 'remove-from-network':
            (function () {
                var vlanID = commandArgs[0];
                var vlanName = commandArgs[1];

                // todo respect response
                Network.removeFromVlan(vlanID, vlanName)
                    .done();
            })();
            break;


        /*
         case 'update-board':
         var testing = spawn('ip',['link','set',args[3],'down']);
         testing.on('close', function (code) {
         var testing2 = spawn('ip',['addr','del',args[4],'dev',args[3]]);
         testing2.on('close',function (code) {
         var testing3 = spawn('ip',['addr','add',args[2],'broadcast',args[5],'dev',args[3]]);
         testing3.on('close',function (code) {
         spawn('ip',['link','set',args[3],'up']);
         })
         });
         });
         break;
         */

    }
}

/**
 * board.command topic
 * @param args
 */
function boardCommand(args) {

    var targetBoardCode = args[0];
    var command = args[1];
    var commandArgs = args.slice(2);

    // The first argument of each message is the board code
    // If the message is not for this board - skip it
    if (targetBoardCode !== Board.getState().getBoardCode()) {
        return;
    }

    logger.info('L-R COMMAND - It is a message for me with args: ' + command + " " + commandArgs);

    switch (command) {

        // If the messages are related to service to be exported call the corresponding method
        case 'tty':
        case 'ssh':
        case 'ideino':
        case 'osjs':
            service(command, commandArgs[0], commandArgs[1]);
            break;
        case 'add-to-network':
        case 'remove-from-network':
        case 'update-board':
            networks(command, commandArgs);
            break;
    }
}

/**
 * Exports procedures and subscribes to topics for the session
 * @param session {BaseWAMPSession}
 */
module.exports = function (session) {

    // todo maybe use procedures instead of PubSub?

    // Subscribing to the command topic to receive messages for asynchronous
    // operation to be performed
    // Maybe everything can be implemented as RPCs
    // Right now the boardCommand is invoked as soon as a message is received
    // on the topic
    session.subscribe('board.command', boardCommand);
};
