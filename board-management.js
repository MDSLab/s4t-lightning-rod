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

exports.checkSettings = function (callback){

    
    try{
 
      	var check_response = null;
	  
	// LOGGING CONFIGURATION --------------------------------------------------------------------
	loglevel = nconf.get('config:log:loglevel');

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

	if (loglevel === undefined){
	  logger.setLevel('INFO');
	  logger.warn('[SYSTEM] - LOG LEVEL not defined... default has been set: INFO'); 
	  check_response = true;
	  
	}else if (loglevel === ""){
	  logger.setLevel('INFO');
	  logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO'); 
	  check_response = true;
	
	}else{
	  
	  logger.setLevel(loglevel);
	  logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel); 
	  check_response = true;
	  
	}
	//------------------------------------------------------------------------------------------
	
	
	//WAMP CONF
	url_wamp = nconf.get('config:wamp:url_wamp');
	port_wamp = nconf.get('config:wamp:port_wamp');
	realm = nconf.get('config:wamp:realm');
	
	if ( (url_wamp == undefined || url_wamp == "") || (port_wamp == undefined || port_wamp == "") || (realm == undefined || realm == "") ){
	  
	  logger.warn('[SYSTEM] - WAMP configuration wrong or not specified!');
	  logger.debug(' - url_wamp value: ' + url_wamp);
	  logger.debug(' - port_wamp value: ' + port_wamp);
	  logger.debug(' - realm value: ' + realm);
	  
	  process.exit();
	
	}else{
	  check_response = true;
	}
	  

	
	//REVERSE CONF
	url_reverse = nconf.get('config:reverse:server:url_reverse');
	port_reverse = nconf.get('config:reverse:server:port_reverse');
	wstt_lib = nconf.get('config:reverse:lib:bin');
	
	if ( (url_reverse == undefined || url_reverse == "") || (port_reverse == undefined || port_reverse == "") || (wstt_lib == undefined || wstt_lib == "") ){
	  
	  logger.warn('[SYSTEM] - WSTT configuration wrong or not specified!');
	  logger.debug(' - url_reverse value: ' + url_reverse);
	  logger.debug(' - port_reverse value: ' + port_reverse);
	  logger.debug(' - wstt_lib value: ' + wstt_lib);

	  process.exit();
	  
	}else{
	  check_response = true;
	}
	
	
	// BOARD CONF
	device = nconf.get('config:device');
	if (device == undefined || device == ""){
	    logger.warn('[SYSTEM] - Device "' + device + '" not supported!');
	    logger.warn(' - Supported devices are: "laptop", "arduino_yun", "raspberry_pi".');
	    process.exit();
	}
	
	boardCode = nconf.get('config:board:code');
	if (boardCode == undefined || boardCode == ""){
	    logger.warn('[SYSTEM] - Board UUID undefined or not specified!');
	    process.exit();
	}else{
	  check_response = true;
	}
	
	reg_status = nconf.get('config:board:status');
	if (reg_status == undefined || reg_status == ""){
	    logger.warn('[SYSTEM] - Registration status undefined or not specified!');
	    process.exit();

	}else if (reg_status != "registered" && reg_status != "new"){
	    logger.warn('[SYSTEM] - Wrong registration status: ' + reg_status);
	    logger.warn(' - The registration status can be "registered" or "new".');
	    process.exit();

	}else{
	  check_response = true;
	}
	
	var board_position = nconf.get('config:board:position');
	
	if (board_position == undefined || Object.keys(board_position).length === 0){
	    logger.warn('[SYSTEM] - Wrong board coordinates! Set status to "new" to retrive these information.');
	    logger.debug('- Coordinates: ' + JSON.stringify(board_position));
	    process.exit();

	}
	
	// SOCAT CONF
	var socat_port = nconf.get('config:socat:client:port');
	
	if (socat_port == undefined || socat_port == ""){
	    logger.warn('[SYSTEM] - socat_port not specified or undefined: if the board is network enabled specify this parameter!');
	}	
	
	callback(check_response);	

	
	
	
    }
    catch(err){
	// DEFAULT LOGGING
	log4js = require('log4js');
	log4js.loadAppender('file');    
	logfile = './s4t-lightning-rod.log';
	log4js.addAppender(log4js.appenders.file(logfile));  

	//service logging configuration: "main"                                                  
	logger = log4js.getLogger('main');  
	
	logger.error('[SYSTEM] - '+ err);
	process.exit();

    }  
	  

    

  
}


exports.exportManagementCommands = function (session){
    
      var boardCode = nconf.get('config:board:code');
      
      //Register all the module functions as WAMP RPCs    
      logger.info('[WAMP-EXPORTS] Management commands exported to the cloud!');
      session.register(boardCode+'.command.setBoardPosition', exports.setBoardPosition);

}



//This function contains the logic that has to be performed if I'm connected to the WAMP server
exports.manage_WAMP_connection = function  (session, details){
                
      logger.info("[SYSTEM] - S4T configuration starting...");

      var boardCode = nconf.get('config:board:code');

      //EXPORTING NETWORK COMMANDS 
      var manageNetworks = require('./manage-networks');
      manageNetworks.exportNetworkCommands(session);


      //Topic on which the board can send a message to be registered 
      var connectionTopic = 'board.connection';

      //Topic on which the board can listen for commands
      var commandTopic = 'board.command';


      //Registering the board to the Cloud by sending a message to the connection topic
      logger.info('[WAMP] - Sending board ID ' + boardCode + ' to topic ' + connectionTopic + ' to register the board');
      session.publish(connectionTopic, [boardCode, 'connection', session._id]);

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

}
            
            
            




exports.setBoardPosition = function (args){
  
  var board_position = args[0];

  
  logger.info("[SYSTEM] - Set board position: " + JSON.stringify(board_position));
  
  var configFileName = './settings.json';
  var configFile = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
  var board_config = configFile.config["board"];
  var board_status = board_config["status"];
  
  var board_config = configFile.config["board"];
  logger.info("[SYSTEM] --> BOARD CONFIGURATION " + JSON.stringify(board_config));
  

  board_config["position"] = board_position;
  logger.info("[SYSTEM] --> BOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]));
  
  //Updates the settings.json file
  fs.writeFile(configFileName, JSON.stringify(configFile, null, 4), function(err) {
      if(err) {
	  logger.error('[SYSTEM] --> Error writing settings.json file: ' + err);
	  
      } else {
	
	  logger.debug("[SYSTEM] --> settings.json configuration file saved to " + configFileName);

      }
  });

  return "Board configuration file updated!";

  
}	


