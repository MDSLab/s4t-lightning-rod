//############################################################################################
//##
//# Copyright (C) 2014-2017 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################

//service logging configuration: "board-management"   
var logger = log4js.getLogger('board-management');


var fs = require("fs");

var board_session = null;

var spawn = require('child_process').spawn;

var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;

var exec = require('child_process').exec;
var Q = require("q");


// This function contains the logic that has to be performed if I'm connected to the WAMP server
function manage_WAMP_connection(session) {

    logger.info('[CONFIGURATION] - Board configuration starting...');

    //EXPORTING NETWORK COMMANDS
    var manageNetworks = require(LIGHTNINGROD_HOME + '/modules/vnets-manager/manage-networks');
    manageNetworks.exportNetworkCommands(session);


    //Topic on which the board can send a message to be registered
    var connectionTopic = 'board.connection';
    session.subscribe(connectionTopic, onTopicConnection);
    //Registering the board to the Cloud by sending a message to the connection topic
    logger.info("[WAMP] - Sending board ID '" + boardCode + "' to topic " + connectionTopic + " to register the board");
    session.publish(connectionTopic, [boardCode, 'connection', session._id]);

}

// This function manages the messages published in "board.connection" topic
function onTopicConnection(args) {
    var message = args[0];
    if (message == 'IoTronic-connected')
        logger.info("Message on board.connection: " + args[0])


}

// This function loads the Lightning-rod modules
function moduleLoader (session, device) {
    // MODULES LOADING--------------------------------------------------------------------------------------------------
    var manageGpio = require(LIGHTNINGROD_HOME + '/modules/gpio-manager/manage-gpio');
    manageGpio.exportPins(session, lyt_device);

    var managePlugins = require(LIGHTNINGROD_HOME + '/modules/plugins-manager/manage-plugins');
    managePlugins.exportPluginCommands(session);

    var driversManager = require(LIGHTNINGROD_HOME + "/modules/drivers-manager/manage-drivers");
    driversManager.exportDriverCommands(session);
    driversManager.restartDrivers();

    var fsManager = require(LIGHTNINGROD_HOME + "/modules/vfs-manager/manage-fs");
    fsManager.exportFSCommands(session);
    var fsLibsManager = require(LIGHTNINGROD_HOME + "/modules/vfs-manager/manage-fs-libs");
    fsLibsManager.exportFSLibs(session);

    var manageServices = require(LIGHTNINGROD_HOME + '/modules/services-manager/manage-services');
    manageServices.exportServiceCommands(session);
    //------------------------------------------------------------------------------------------------------------------
}


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
        wstun_lib = nconf.get('config:reverse:lib:bin');

        if ((url_reverse == undefined || url_reverse == "") || (port_reverse == undefined || port_reverse == "") || (wstun_lib == undefined || wstun_lib == "")) {

            logger.warn('[SYSTEM] - WSTUN configuration is wrong or not specified!');
            logger.debug(' - url_reverse value: ' + url_reverse);
            logger.debug(' - port_reverse value: ' + port_reverse);
            logger.debug(' - wstun_lib value: ' + wstun_lib);

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


// This function sets the coordinates of the device: called by Iotronic via RPC
exports.setBoardPosition = function (args) {

    var board_position = args[0];
    logger.info("[SYSTEM] - Set board position: " + JSON.stringify(board_position));

    var configFile = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    var board_config = configFile.config["board"];
    logger.info("[SYSTEM] --> BOARD CONFIGURATION " + JSON.stringify(board_config));

    board_config["position"] = board_position;
    logger.info("[SYSTEM] --> BOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]));

    //Updates the settings.json file
    fs.writeFile(SETTINGS, JSON.stringify(configFile, null, 4), function (err) {
        if (err) {
            logger.error('[SYSTEM] --> Error writing settings.json file: ' + err);
        } else {
            logger.debug("[SYSTEM] --> settings.json configuration file saved to " + SETTINGS);
        }
    });

    return "Board configuration file updated!";


};

/*
// This function sets the coordinates of the device: called by IoTronic via RPC
exports.updateConf = function (args) {

    var remote_conf = args[0];
    var board_position = args[1];
    logger.info("[SYSTEM] - Set board configuration: " + JSON.stringify(args));

    var configFile = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    var board_config = configFile.config["board"];
    
    logger.info("[SYSTEM] --> BOARD CONFIGURATION " + JSON.stringify(board_config));

    board_config["remote_conf"] = remote_conf;
    board_config["position"] = board_position;
    logger.info("[SYSTEM] --> BOARD CONF UPDATED: " + JSON.stringify(board_config));

    //Updates the settings.json file
    fs.writeFile(SETTINGS, JSON.stringify(configFile, null, 4), function (err) {
        if (err) {
            logger.error('[SYSTEM] --> Error writing settings.json file: ' + err);
        } else {
            logger.debug("[SYSTEM] --> settings.json configuration file saved to " + SETTINGS);
        }
    });

    return "Board configuration file updated!";


};
*/

// This function manages the registration status of the board
exports.checkRegistrationStatus = function(args){

    var response = args[0];
    
    if(response.result == "SUCCESS"){

        logger.info("[SYSTEM] - Connection to Iotronic "+response.result+" - "+response.message);

        // CONNECTION TO IoTronic after access granted.
        var configFile = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
        var board_config = configFile.config["board"];

        logger.info("[CONFIGURATION] - Board configuration parameters: " + JSON.stringify(board_config));

        //PROVISIONING: Iotronic sends coordinates to this device when its status is "new"
        if(reg_status === "new"){

            logger.info('[CONFIGURATION] - NEW BOARD CONFIGURATION STARTED... ');
            
            board_session.call("s4t.board.provisioning", [boardCode]).then(

                function(result){

                    logger.info("\n\nPROVISIONING "+boardCode+" RECEIVED: " + JSON.stringify(result) + "\n\n");

                    board_position = result.message[0];
                    board_config["position"]=result.message[0];
                    board_config["status"]="registered";

                    logger.info("\n[CONFIGURATION] - BOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]));

                    //Updates the settings.json file
                    fs.writeFile(SETTINGS, JSON.stringify(configFile, null, 4), function(err) {
                        if(err) {
                            logger.error('Error writing settings.json file: ' + err);

                        } else {
                            logger.info("settings.json configuration file saved to " + SETTINGS);
                            //Calling the manage_WAMP_connection function that contains the logic that has to be performed if the device is connected to the WAMP server
                            //exports.manage_WAMP_connection(board_session, details);
                            moduleLoader(board_session, lyt_device);
                        }
                    });

                    //Create a backup file of settings.json
                    fs.writeFile(SETTINGS + ".BKP", JSON.stringify(configFile, null, 4), function(err) {
                        if(err) {
                            logger.error('Error writing settings.json.BKP file: ' + err);

                        } else {
                            logger.info("settings.json.BKP configuration file saved to " + SETTINGS + ".BKP");
                        }
                    });


                },
                function (error){
                    logger.error('[WAMP] - Error board provisioning: ' + JSON.stringify(error));
                }
                
            );


        } else if(reg_status === "registered"){
            
            moduleLoader(board_session, lyt_device);

        } else{

            logger.error('[CONFIGURATION] - WRONG BOARD STATUS: status allowed "new" or "registerd"!');
            process.exit();

        }










    }else {
        // IF access to IoTronic was rejected
        logger.error("[SYSTEM] - Connection to Iotronic "+response.result+" - "+response.message);
        logger.info("[SYSTEM] - Bye");

        process.exit();
    }
    

    

};


// To execute pre-defined commands in the board shell
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

            logger.info('[SYSTEM] - Rebooting...');
            response.message = "Rebooting";
            response.result = "SUCCESS";
            d.resolve(response);

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

        case 'hostname':

            exec('echo `hostname`', function(error, stdout, stderr){

                if(error) {
                    logger.error('[SYSTEM] - Echo result: ' + error);
                    response.message = error;
                    response.result = "ERROR";
                    d.resolve(response);
                }
                else if (stderr){
                    if (stderr == "")
                        stderr = "Doing echo...";

                    logger.info('[SYSTEM] - Echo result: ' + stderr);
                    response.message = stderr;
                    response.result = "WARNING";
                    d.resolve(response);
                }
                else{
                    stdout = stdout.replace(/\n$/, '');
                    logger.info('[SYSTEM] - Echo result: ' + stdout);
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

    board_session = session;

    //Register all the module functions as WAMP RPCs
    logger.info('[WAMP-EXPORTS] Management commands exported to the cloud!');
    session.register('s4t.' + boardCode + '.board.setBoardPosition', exports.setBoardPosition);
    session.register('s4t.' + boardCode + '.board.checkRegistrationStatus', exports.checkRegistrationStatus);
    session.register('s4t.' + boardCode + '.board.execAction', exports.execAction);
    //session.register('s4t.' + boardCode + '.board.updateConf', exports.updateConf);

    manage_WAMP_connection(session)
    
};

