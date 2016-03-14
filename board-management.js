//service logging configuration: "board-management"   
var logger = log4js.getLogger('board-management');

var fs = require("fs");

exports.exportManagementCommands = function (session){
    
      var boardCode = nconf.get('config:board:code');
      
      //Register all the module functions as WAMP RPCs    
      logger.info('Exporting management commands to the Cloud');
      session.register(boardCode+'.command.setBoardPosition', exports.setBoardPosition);

}



//This function contains the logic that has to be performed if I'm connected to the WAMP server
exports.manage_WAMP_connection = function  (session, details){
                
      logger.info("S4T configuration starting...");

      var boardCode = nconf.get('config:board:code');

      //EXPORTING NETWORK COMMANDS 
      var manageNetworks = require('./manage-networks');
      manageNetworks.exportNetworkCommands(session);


      //Topic on which the board can send a message to be registered 
      var connectionTopic = 'board.connection';

      //Topic on which the board can listen for commands
      var commandTopic = 'board.command';



      //Registering the board to the Cloud by sending a message to the connection topic
      logger.info('WAMP: Sending board ID ' + boardCode + ' to topic ' + connectionTopic + ' to register the board');
      session.publish(connectionTopic, [boardCode, 'connection', session._id]);

      //Subscribing to the command topic to receive messages for asyncronous operation to be performed
      //Maybe everything can be implemented as RPCs
      //Right now the onCommand method of the manageCommands object is invoked as soon as a message is received on the topic
      logger.info('WAMP: Registering to command topic ' + commandTopic);
      var manageCommands = require('./manage-commands');
      session.subscribe(commandTopic, manageCommands.onCommand);

      //If I'm connected to the WAMP server I can export my pins on the Cloud as RPCs
      var managePins = require('./manage-pins');
      managePins.exportPins(session);

      //If I'm connected to the WAMP server I can receive measures to be scheduled as RPCs
      var manageMeasures = require('./manage-measures');
      manageMeasures.exportMeasureCommands(session);

      //If I'm connected to the WAMP server I can receive plugins to be scheduled as RPCs
      var managePlugins = require('./manage-plugins');
      managePlugins.exportPluginCommands(session);


      //MEASURES --------------------------------------------------------------------------------------------
      //Even if I cannot connect to the WAMP server I can try to dispatch the alredy scheduled measures
      var manageMeasure = require('./manage-measures');
      manageMeasure.restartAllActiveMeasures();
      //-----------------------------------------------------------------------------------------------------

      // PLUGINS RESTART ALL --------------------------------------------------------------------------------
      //This procedure restarts all plugins in "ON" status
      var managePlugins = require('./manage-plugins');
      managePlugins.restartAllActivePlugins();
      //-----------------------------------------------------------------------------------------------------
		

		



}
            
            
            




exports.setBoardPosition = function (args){
  
  var board_position = args[0];

  
  logger.info("setBoardPosition: " + JSON.stringify(board_position));
  
  var configFileName = './settings.json';
  var configFile = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
  var board_config = configFile.config["board"];
  var board_status = board_config["status"];
  
  var board_config = configFile.config["board"];
  logger.info("\nBOARD CONFIGURATION " + JSON.stringify(board_config));
  

  board_config["position"] = board_position;
  logger.info("\nBOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]));
  
  //Updates the settings.json file
  fs.writeFile(configFileName, JSON.stringify(configFile, null, 4), function(err) {
      if(err) {
	  logger.error('Error writing settings.json file: ' + err);
	  
      } else {
	
	  
	  logger.info("settings.json configuration file saved to " + configFileName);
	  
	  


      }
  });

  return "Board configuration file updated!";

  
}	


