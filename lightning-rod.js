/*
 * Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 * 
 * Copyright (c) 2014 2015 Dario Bruneo, Francesco Longo, Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto
 */

//Loading configuration file
nconf = require('nconf');
nconf.file ({file: 'settings.json'});

var fs = require("fs");

//main logging configuration                                                                
log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('/var/log/s4t-lightning-rod.log'));               

//service logging configuration: "main"                                                  
var logger = log4js.getLogger('main');  

logger.info('##############################');  
logger.info('  Stack4Things Lightning-rod');  
logger.info('##############################');  

servicesProcess = [];

//Reading information about the device from configuration file
var device = nconf.get('config:device');

//for connection test
var isReachable = require('is-reachable');
var online = true;
active = true;
var keepWampAlive = null;

//Read the board code from the configuration file
boardCode = nconf.get('config:board:code');


//If the device has been specified
if (typeof device !== 'undefined'){

    logger.info('The device is ' + device);
    

    //WAMP --------------------------------------------------------------------------------------------------------------------------------------------
    
	    var autobahn = require('autobahn');
	    
	    var wampUrl = nconf.get('config:wamp:url_wamp')+":"+nconf.get('config:wamp:port_wamp')+"/ws";
	    var wampRealm = nconf.get('config:wamp:realm');
	    var wampConnection = new autobahn.Connection({
		url: wampUrl,
		realm: wampRealm,
		max_retries: -1
	    });
	    
	    var wampIP = wampUrl.split("//")[1].split(":")[0];
	    //logger.info("WAMP SERVER IP: "+wampIP);
    

            //This function is called as soon as the connection is created successfully
            wampConnection.onopen = function (session, details) {
	      
	      
		if (keepWampAlive != null){
		  clearInterval( keepWampAlive );
		}
	      
		logger.info('WAMP: Connection to WAMP server '+ wampUrl + ' created successfully!');
		logger.info('WAMP: Connected to realm '+ wampRealm);
		logger.info('WAMP: Session ID: '+ session._id);
		//logger.info('Connection details: '+ JSON.stringify(details));
		
		
		// RPC registration of Board Management Commands
		var manageBoard = require('./board-management');
		manageBoard.exportManagementCommands(session);
			
	
		var configFileName = './settings.json';
		var configFile = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
		var board_config = configFile.config["board"];
		var board_status = board_config["status"];
		
		var board_config = configFile.config["board"];
		logger.info("BOARD CONFIGURATION PARAMETERS: " + JSON.stringify(board_config));
				
		//PROVISIONING: Iotronic sends coordinates to the new board	
		if(board_status === "new"){
		  
			logger.info('NEW BOARD CONFIGURATION STARTED... ');
		
			session.call("s4t.board.provisioning", [boardCode]).then(
			  
			    function(result){

				logger.info("\n\nPROVISIONING "+boardCode+" RECEIVED: " + JSON.stringify(result) + "\n\n")
				
				board_position = result[0];
				board_config["position"]=result[0];
				board_config["status"]="registered";
				
				logger.info("\nBOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]))
				
				
				//Updates the settings.json file
				fs.writeFile(configFileName, JSON.stringify(configFile, null, 4), function(err) {
				    if(err) {
					logger.error('Error writing settings.json file: ' + err);
					
				    } else {
				      
					
					logger.info("settings.json configuration file saved to " + configFileName);
					
					manageBoard.manage_WAMP_connection(session, details);
					

			
				    }
				});

			
			}, session.log);
			
			
		} else if(board_status === "registered"){
		  
		      logger.info('REGISTERED BOARD CONFIGURATION STARTING ');
		  
		      //Calling the manage_WAMP_connection function that contains the logic that has to be performed if I'm connected to the WAMP server
		      manageBoard.manage_WAMP_connection(session, details);
		  
		} else{
		  
		  logger.info('WRONG BOARD STATUS: status allowed "new" or "registerd"!');
		  
		  
		}
     

		
		//----------------------------------------------------------------------------------------------------
		// THIS IS AN HACK TO FORCE RECONNECTION AFTER A BREAK OF INTERNET CONNECTION
		//----------------------------------------------------------------------------------------------------
		
		keepWampAlive = setInterval(function(){
		  
		    // TO CHECK WAMP CONNECTION
		    try{
			if(session.isOpen){
			    session.publish('board.connection', ['alive']);
			}
		    }  
		    catch(err){
			logger.warn('Error keeping alive wamp connection: '+ err);
		    }
		    
		    // TO CHECK SERVER CONNECTION
		    isReachable(wampIP, function (err, reachable) {
		      
			if(!reachable){
			  logger.warn("CONNECTION STATUS: "+reachable+ " - ERROR: "+err);
			  
			} 
			
		    });
		    
		    /* DEPRECATED
		    isReachable(wampIP, function (err, reachable) {
		      
		      if(!reachable){
			logger.warn("CONNECTION STATUS: "+reachable+ " - ERROR: "+err);
			online=false;
			
		      } else {
			
			if(!online){
				if(session.isOpen){
				  session.publish('board.connection', ['alive']);
				  online=true;
				}
				
			}
			
		      }
		      
		      
		    });
		    */
   
                }, 5000);
		//----------------------------------------------------------------------------------------------------
		
		
            };
            
            //This function is called if there are problems with the WAMP connection
            wampConnection.onclose = function (reason, details) {
	      
		try{
		      logger.error('WAMP: Error in connecting to WAMP server!');
		      logger.error('- Reason: ' + reason);
		      logger.error('- Reconnection Details: ');
		      logger.error("  - retry_delay:", details.retry_delay);
		      logger.error("  - retry_count:", details.retry_count);
		      logger.error("  - will_retry:", details.will_retry);

		      if(wampConnection.isOpen){
			  logger.info("WAMP: connection is open!");
		      }
		      else{
			  logger.warn("WAMP: connection is closed!");
		      }
	      
		      if(session.isOpen){
			  logger.info("WAMP: session is open!");
		      }
		      else{
			  logger.warn("WAMP: session is closed!");
		      }
		}  
		catch(err){
		    logger.warn('Error in wamp connection: '+ err);
		}

		
            };
    
    //-------------------------------------------------------------------------------------------------------------------------------------------------
    
    function Main_Arduino_Yun(){
	/*        
        //Writing to the watchdog file to signal I am alive
        require('shelljs/global');
        setInterval(function(){                    
            echo('1').to(‘/dev/watchdog’);
        },5000);
        */
        
        //Connecting to the board
        var linino = require('ideino-linino-lib');
        board = new linino.Board();
        logger.info('Board initialization...');  
        
        //Given the way linino lib is designed we first need to connect to the board and only then we can do anything else
        board.connect(function() {

            
            //Opening the connection to the WAMP server
            logger.info('WAMP: Opening connection to WAMP server ('+ wampIP +')...');  
            wampConnection.open();

	    
            //MEASURES --------------------------------------------------------------------------------------------
            //Even if I cannot connect to the WAMP server I can try to dispatch the alredy scheduled measures
            var manageMeasure = require('./manage-measures');
            //manageMeasure.restartAllActiveMeasures();
            //-----------------------------------------------------------------------------------------------------

	    // PLUGINS RESTART ALL -------------------------------------------------------------------------------
	    //This procedure restarts all plugins in "ON" status
	    var managePlugins = require('./manage-plugins');
	    //managePlugins.restartAllActivePlugins();  //OLD approach
	    managePlugins.pluginsLoader();
	    //----------------------------------------------------------------------------------------------------

	    
        });
         
      
    }
    
    
    
    function Main_Laptop(){
      
      	//Opening the connection to the WAMP server
	logger.info('WAMP: Opening connection to WAMP server ('+ wampIP +')...');  
	wampConnection.open();
        
    }
    
    
	    
    switch(device){
      
	case 'arduino_yun':
	    logger.info("L-R Arduino Yun starting...");
	    Main_Arduino_Yun();
	    break
	case 'laptop':
	    logger.info("L-R laptop starting...");
	    Main_Laptop();
	    break                         
	case 'raspberry_pi':
	    logger.info("L-R Raspberry Pi starting...");
	    break   	    
	default:
	    //DEBUG MESSAGE
	    logger.warn('Device "' + device + '" not supported!');
	    logger.warn('Supported devices are: "laptop", "arduino_yun", "raspberry_pi".');
	    process.exit();
	    break;
	    
	    
    }
    
    
    
    
}
else{
    logger.warn('Please insert the kind of device in settings.json');
    process.exit();
}