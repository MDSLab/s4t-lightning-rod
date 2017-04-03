/*
 *				 Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
 * 
 */

//service logging configuration: "board-management"   
var logger = log4js.getLogger('board-management');


var fs = require("fs");


var spawn = require('child_process').spawn;

exports.execute = function (command, label) {
    cmd = command.split(' ');
    logger.debug(label + ' COMMAND: ' + command);
    var result = spawn(cmd[0], cmd.slice(1));

    result.stdout.on('data', function (data) {
        logger.debug(label + ' stdout: ' + data);
    });

    result.stderr.on('data', function (data) {
        if (command.indexOf('socat') > -1)
            logger.info(label + ' stderr: ' + data);
        else
            logger.error(label + ' stderr: ' + data);
    });

    return result;

};


// Init() LR function in order to control the correct LR configuration:
// - logging setup
// - settings control
exports.Init_Ligthning_Rod = function (callback) {

    log4js.loadAppender('file');

    function LogoLR() {
        logger.info('##############################');
        logger.info('  Stack4Things Lightning-rod');
        logger.info('##############################');
    }

    /*
     OFF	nothing is logged
     FATAL	fatal errors are logged
     ERROR	errors are logged
     WARN	warnings are logged
     INFO	infos are logged
     DEBUG	debug infos are logged
     TRACE	traces are logged
     ALL	everything is logged
     */

    try {

        //check logfile parameter
        logfile = nconf.get('config:log:logfile');

        if (logfile === "undefined" || logfile == "") {
            // DEFAULT LOGGING CONFIGURATION LOADING
            logfile = './s4t-lightning-rod.log';
            log4js.addAppender(log4js.appenders.file(logfile));
            logger = log4js.getLogger('main');		//service logging configuration: "main"

            LogoLR();

            callback({result: "ERROR"});

        } else {

            log4js.addAppender(log4js.appenders.file(logfile));
            logger = log4js.getLogger('main');		//service logging configuration: "main"

            LogoLR();

            //check loglevel parameter
            loglevel = nconf.get('config:log:loglevel');

            if (loglevel === "undefined" || loglevel == "") {

                logger.setLevel('INFO');
                logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO');

            } else {

                logger.setLevel(loglevel);
                logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel);

            }

            //Start LR settings checks
            exports.checkSettings(function (check) {

                if (check === true) {
                    callback({result: "SUCCESS"});
                } else {
                    callback({result: "ERROR"});
                }

            });

        }

    }
    catch (err) {
        // DEFAULT LOGGING
        logfile = './s4t-lightning-rod.log';
        log4js.addAppender(log4js.appenders.file(logfile));
        logger = log4js.getLogger('main');		//service logging configuration: "main"
        LogoLR();
        logger.error('[SYSTEM] - Logger configuration error: ' + err);
        callback({result: "ERROR"});

    }

};

// This function checks the settings correctness
exports.checkSettings = function (callback) {

    try {

        var check_response = null;

        //WAMP CONF
        url_wamp = nconf.get('config:wamp:url_wamp');
        port_wamp = nconf.get('config:wamp:port_wamp');
        realm = nconf.get('config:wamp:realm');

        if ((url_wamp == undefined || url_wamp == "") || (port_wamp == undefined || port_wamp == "") || (realm == undefined || realm == "")) {

            logger.warn('[SYSTEM] - WAMP configuration is wrong or not specified!');
            logger.debug(' - url_wamp value: ' + url_wamp);
            logger.debug(' - port_wamp value: ' + port_wamp);
            logger.debug(' - realm value: ' + realm);

            process.exit();

        } else {
            check_response = true;
        }

        //REVERSE CONF
        url_reverse = nconf.get('config:reverse:server:url_reverse');
        port_reverse = nconf.get('config:reverse:server:port_reverse');
        wstt_lib = nconf.get('config:reverse:lib:bin');

        if ((url_reverse == undefined || url_reverse == "") || (port_reverse == undefined || port_reverse == "") || (wstt_lib == undefined || wstt_lib == "")) {

            logger.warn('[SYSTEM] - WSTT configuration is wrong or not specified!');
            logger.debug(' - url_reverse value: ' + url_reverse);
            logger.debug(' - port_reverse value: ' + port_reverse);
            logger.debug(' - wstt_lib value: ' + wstt_lib);

            process.exit();

        } else {
            check_response = true;
        }

        // BOARD CONF
        device = nconf.get('config:device');
        if (device == undefined || device == "") {
            logger.warn('[SYSTEM] - Device "' + device + '" not supported!');
            logger.warn(' - Supported devices are: "laptop", "arduino_yun", "raspberry_pi".');
            process.exit();
        }

        boardCode = nconf.get('config:board:code');
        if (boardCode == undefined || boardCode == "") {
            logger.warn('[SYSTEM] - Board UUID undefined or not specified!');
            process.exit();
        } else {
            check_response = true;
        }

        reg_status = nconf.get('config:board:status');
        if (reg_status == undefined || reg_status == "") {
            logger.warn('[SYSTEM] - Registration status undefined or not specified!');
            process.exit();

        } else if (reg_status != "registered" && reg_status != "new") {
            logger.warn('[SYSTEM] - Wrong registration status: ' + reg_status);
            logger.warn(' - The registration status can be "registered" or "new".');
            process.exit();

        } else {
            check_response = true;
        }

        var board_position = nconf.get('config:board:position');

        if (board_position == undefined || Object.keys(board_position).length === 0) {
            logger.warn('[SYSTEM] - Wrong board coordinates! Set status to "new" to retrive these information.');
            logger.debug('- Coordinates: ' + JSON.stringify(board_position));
            process.exit();

        }

        // SOCAT CONF
        var socat_port = nconf.get('config:socat:client:port');

        if (socat_port == undefined || socat_port == "") {
            logger.warn('[SYSTEM] - socat_port not specified or undefined: if the board is network enabled specify this parameter!');
        }

        callback(check_response);


    }
    catch (err) {
        // DEFAULT LOGGING
        log4js = require('log4js');
        log4js.loadAppender('file');
        logfile = './s4t-lightning-rod.log';
        log4js.addAppender(log4js.appenders.file(logfile));

        //service logging configuration: "main"
        logger = log4js.getLogger('main');

        logger.error('[SYSTEM] - ' + err);
        process.exit();

    }


};


function onTopicConnection(args) {
    var message = args[0];
    if (message == 'Iotronic-connected')
        logger.info("Message on board.connection: " + args[0])
    

}

//This function contains the logic that has to be performed if I'm connected to the WAMP server
exports.manage_WAMP_connection = function (session, details) {

    logger.info('[CONFIGURATION] - Registered board configuration starting...');
    
    //EXPORTING NETWORK COMMANDS 
    var manageNetworks = require('./manage-networks');
    manageNetworks.exportNetworkCommands(session);

    
    //Topic on which the board can send a message to be registered 
    var connectionTopic = 'board.connection';
    session.subscribe(connectionTopic, onTopicConnection);
    //Registering the board to the Cloud by sending a message to the connection topic
    logger.info('[WAMP] - Sending board ID ' + boardCode + ' to topic ' + connectionTopic + ' to register the board');
    session.publish(connectionTopic, [boardCode, 'connection', session._id]);

    
    //Topic on which the board can listen for commands
    var commandTopic = 'board.command';
    //Subscribing to the command topic to receive messages for asyncronous operation to be performed
    //Maybe everything can be implemented as RPCs
    //Right now the onCommand method of the manageCommands object is invoked as soon as a message is received on the topic
    logger.info('[WAMP] - Registering to command topic ' + commandTopic);
    var manageCommands = require('./manage-commands');
    session.subscribe(commandTopic, manageCommands.onCommand);

    
    //If I'm connected to the WAMP server I can export my pins on the Cloud as RPCs
    var managePins = require('./manage-pins');
    managePins.exportPins(session);

    //If I'm connected to the WAMP server I can receive plugins to be scheduled as RPCs
    var managePlugins = require('./manage-plugins');
    managePlugins.exportPluginCommands(session);

    //If I'm connected to the WAMP server I can receive RPC command requests to manage drivers
    var driversManager = require("./manage-drivers");
    driversManager.exportDriverCommands(session);
    driversManager.restartDrivers();

    //If I'm connected to the WAMP server I can receive RPC command requests to manage FUSE filesystem
    var fsManager = require("./manage-fs");
    fsManager.exportFSCommands(session);
    var fsLibsManager = require("./manage-fs-libs.js");
    fsLibsManager.exportFSLibs(session);

};

// This function sets the coordinates of the device: called by Iotronic via RPC
exports.setBoardPosition = function (args) {

    var board_position = args[0];
    logger.info("[SYSTEM] - Set board position: " + JSON.stringify(board_position));

    var configFile = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
    var board_config = configFile.config["board"];
    logger.info("[SYSTEM] --> BOARD CONFIGURATION " + JSON.stringify(board_config));

    board_config["position"] = board_position;
    logger.info("[SYSTEM] --> BOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]));

    //Updates the settings.json file
    fs.writeFile(configFileName, JSON.stringify(configFile, null, 4), function (err) {
        if (err) {
            logger.error('[SYSTEM] --> Error writing settings.json file: ' + err);
        } else {
            logger.debug("[SYSTEM] --> settings.json configuration file saved to " + configFileName);
        }
    });

    return "Board configuration file updated!";


};

// This function manages the wrong/unregistered status of the board
exports.checkRegistrationStatus = function(args){

    var response = args[0];
    
    logger.error("[SYSTEM] - Connection to Iotronic "+response.result+" - "+response.message);
    logger.info("[SYSTEM] - Bye");

    process.exit();
    

};


var exec = require('child_process').exec;
var Q = require("q");

// Reboot LR
exports.execAction = function(args){

    var d = Q.defer();

    var action = args[0];
    var params = args[1];

    var response = {
        message: '',
        result: ''
    };

    switch (action) {

        case 'reboot':

            exec('reboot', function(error, stdout, stderr){

                if(error) {
                    logger.error('[SYSTEM] - Reboot result: ' + error);
                    response.message = error;
                    response.result = "ERROR";
                    d.resolve(response);
                }
                else if (stderr){
                    if (stderr == "")
                        stderr = "rebooting...";

                    logger.info('[SYSTEM] - Reboot result: ' + stderr);
                    response.message = stderr;
                    response.result = "WARNING";
                    d.resolve(response);
                }
                else{
                    logger.info('[SYSTEM] - Reboot result: ' + stdout);
                    response.message = stdout;
                    response.result = "SUCCESS";
                    d.resolve(response);
                }


            });
            break;

        default:
            
            response.message = "Board operation '" + action + "' not supported!";
            response.result = 'ERROR';
            logger.error("[SYSTEM] - " + response.message);
            d.resolve(JSON.stringify(response));

            break;

    }




    return d.promise;


};


exports.exportManagementCommands = function (session) {

    //Register all the module functions as WAMP RPCs
    logger.info('[WAMP-EXPORTS] Management commands exported to the cloud!');
    session.register(boardCode + '.command.setBoardPosition', exports.setBoardPosition);
    session.register(boardCode + '.command.checkRegistrationStatus', exports.checkRegistrationStatus);
    session.register(boardCode + '.command.execAction', exports.execAction);
    
};