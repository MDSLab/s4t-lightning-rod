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

var util = require('util');
var urlparse = require('url').parse;
var spawn = require('child_process').spawn;
var running = require('is-running');
var connectionTester = require('connection-tester');

var logger = require('../../../utils/log4js-wrapper').getLogger("AutobahnConntestTcpkillWAMPConnection");
var Board = require('../../board');

var AutobahnSimpleWAMPConnection = require('./autobahn-simple');

/**
 * Extends AutobahnSimpleWAMPConnection by adding
 * connection recovery with tcpkill and conntest
 *
 * @param url
 * @param realm
 * @constructor
 */
function AutobahnConntestTcpkillWAMPConnection(url, realm) {
    AutobahnSimpleWAMPConnection.call(this, url, realm);

    this._wampServerHost = urlparse(url).hostname;  // domain or IP
    this._keepAliveTickIntervalId = null;

    this._online = true;
    this._tcpkillCallRequired = false;  // formerly (!wamp_check)
    this._tcpkillPid = null;
}
util.inherits(AutobahnConntestTcpkillWAMPConnection, AutobahnSimpleWAMPConnection);


/**
 * Autobahn's connection onopen callback
 *
 * @param session
 * @param details
 * @private
 */
AutobahnConntestTcpkillWAMPConnection.prototype._onopen = function (session, details) {

    if (this._keepAliveTickIntervalId != null) {
        clearInterval(this._keepAliveTickIntervalId);
        logger.info('[WAMP-RECOVERY] - WAMP CONNECTION RECOVERED!');
        logger.debug('[WAMP-RECOVERY] - Old timer to keep alive WAMP connection cleared!');
    }

    this._keepAliveTickIntervalId = setInterval(this._keepAliveTick.bind(this), 10 * 1000);
    logger.info('[WAMP] - TIMER to keep alive WAMP connection setup!');

    return this.constructor.super_.prototype._onopen.call(this, session, details);
};

/**
 * Autobahn's connection onclose callback
 *
 * @param reason
 * @param details
 * @private
 */
AutobahnConntestTcpkillWAMPConnection.prototype._onclose = function (reason, details) {
    // IMPORTANT: for ethernet connections this flag avoid to start recovery procedure (tcpkill will not start!)
    this._tcpkillCallRequired = false;

    return this.constructor.super_.prototype._onclose.call(this, reason, details);
};

/**
 * Periodic task which checks that connection is still active
 * @private
 */
AutobahnConntestTcpkillWAMPConnection.prototype._keepAliveTick = function () {

    //NEW type of connection tester
    // todo port ???
    connectionTester.test(this._wampServerHost, 8888, 1000, function (err, output) {

        //logger.debug("[WAMP-STATUS] - CONNECTION STATUS: "+JSON.stringify(output));

        var reachable = output.success;
        var errorTest = output.error;

        //logger.debug("[WAMP-STATUS] - CONNECTION STATUS: "+reachable);

        if (!reachable) {
            logger.warn("[CONNECTION-RECOVERY] - INTERNET CONNECTION STATUS: " + reachable + " - ERROR: " + errorTest);
            this._online = false;
            this._tcpkillCallRequired = true;
        } else {
            if (this._online)
                return;

            try {
                logger.info("[CONNECTION-RECOVERY] - INTERNET CONNECTION STATUS: " + reachable);
                logger.info("[CONNECTION-RECOVERY] - INTERNET CONNECTION RECOVERED!");

                this.getSession().publish('board.connection', ['alive-' + Board.getState().getBoardCode()], {}, {acknowledge: true}).then(
                    function (publication) {
                        logger.info("[WAMP-ALIVE-STATUS] - WAMP ALIVE MESSAGE RESPONSE: published -> publication ID is " + JSON.stringify(publication));
                        this._tcpkillCallRequired = false;
                    }.bind(this),
                    function (error) {
                        logger.warn("[WAMP-RECOVERY] - WAMP ALIVE MESSAGE: publication error " + JSON.stringify(error));
                        this._tcpkillCallRequired = true;
                    }.bind(this)
                );

                //It will wait the WAMP alive message response
                setTimeout(this._tcpkillWampConnection.bind(this), 2 * 1000);
            }
            catch (err) {
                logger.warn('[CONNECTION-RECOVERY] - Error keeping alive wamp connection: ' + err);
            }
        }
    }.bind(this));
};

/**
 * Spawns tcpkill if required
 * @private
 */
AutobahnConntestTcpkillWAMPConnection.prototype._tcpkillWampConnection = function () {

    if (!this._tcpkillCallRequired) {
        // WAMP CONNECTION IS OK
        logger.info("[WAMP-ALIVE-STATUS] - WAMP CONNECTION STATUS: " + (!this._tcpkillCallRequired));
        this._online = true;
        return;
    }

    // WAMP CONNECTION IS NOT ESTABLISHED

    logger.warn("[WAMP-ALIVE-STATUS] - WAMP CONNECTION STATUS: " + (!this._tcpkillCallRequired));

    // Check if the tcpkill process was killed after a previous connection recovery
    // Through this check we will avoid to start another tcpkill process
    var tcpkill_status = running(this._tcpkillPid);
    logger.warn("[WAMP-ALIVE-STATUS] - TCPKILL STATUS: " + tcpkill_status + " - PID: " + this._tcpkillPid);

    //at LR startup "tcpkill_pid" is NULL and in this condition "is-running" module return "true" that is a WRONG result!
    if (!(tcpkill_status === false || this._tcpkillPid == null)) {
        logger.warn('[WAMP-RECOVERY] ...tcpkill already started!');
        return;
    }

    logger.warn("[WAMP-RECOVERY] - Cleaning WAMP socket...");

    var tcpkillKillsCount = 0;

    //tcpkill -9 port 8181
    var tcpkillProcess = spawn('tcpkill', ['-9', 'port', '8181']);

    tcpkillProcess.stdout.on('data', function (data) {
        logger.debug('[WAMP-RECOVERY] ... tcpkill stdout: ' + data);
    });

    tcpkillProcess.stderr.on('data', function (data) {
        logger.debug('[WAMP-RECOVERY] ... tcpkill stderr:\n' + data);

        if (data.toString().indexOf("listening") > -1) {

            // LISTENING
            // To manage the starting of tcpkill (listening on port 8181)
            logger.debug('[WAMP-RECOVERY] ... tcpkill listening...');

            this._tcpkillPid = tcpkillProcess.pid;
            logger.debug('[WAMP-RECOVERY] ... tcpkill -9 port 8181 - PID [' + this._tcpkillPid + ']');


        } else if (data.toString().indexOf("win 0") > -1) {

            // TCPKILL DETECT WAMP ACTIVITY (WAMP reconnection attempts)
            // This is the stage triggered when the WAMP socket was killed by tcpkill and wamp reconnection process automaticcally started:
            // in this phase we need to kill tcpkill to allow wamp reconnection.
            tcpkillProcess.kill('SIGINT');

            //double check: It will test after a while if the tcpkill process has been killed
            setTimeout(function () {

                if (running(this._tcpkillPid)) {
                    tcpkillKillsCount = tcpkillKillsCount + 1;

                    logger.warn("[WAMP-RECOVERY] ... tcpkill still running!!! PID [" + this._tcpkillPid + "]");
                    logger.debug('[WAMP-RECOVERY] ... tcpkill killing retry_count ' + tcpkillKillsCount);

                    tcpkillProcess.kill('SIGINT');
                }
            }.bind(this), 3000);
        }
    }.bind(this));

    tcpkillProcess.on('close', function (code) {
        logger.debug('[WAMP-RECOVERY] ... tcpkill killed!');
        logger.info("[WAMP-RECOVERY] - WAMP socket cleaned!");

        this._online = true;
    }.bind(this));
};


module.exports = AutobahnConntestTcpkillWAMPConnection;