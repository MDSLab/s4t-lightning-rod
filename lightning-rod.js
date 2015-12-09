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

//main logging configuration                                                                
log4js = require('log4js');          
log4js.loadAppender('file');         
log4js.addAppender(log4js.appenders.file('/var/log/s4t-lightning-rod.log'));            

//service logging configuration: "main"                                                  
var logger = log4js.getLogger('main');  

logger.info('#############################');  
logger.info('Starting Lightning-rod...');  
logger.info('#############################');  

servicesProcess = [];
socatClient = [];
rtClient = [];
greDevices = [];

//Reading information about the device from configuration file
var device = nconf.get('config:device');

//for connection test
var isReachable = require('is-reachable');
var online = true;


//If the device has been specified
if (typeof device !== 'undefined'){
    
    logger.info('The device is ' + device);
    
    
    
    
    //WAMP --------------------------------------------------------------------------------------------------------------------------------------------
    
	    var autobahn = require('autobahn');
	    
	    var wampUrl = nconf.get('config:wamp:url_wamp')+":"+nconf.get('config:wamp:port_wamp')+"/ws";
	    var wampRealm = nconf.get('config:wamp:realm');
	    var wampConnection = new autobahn.Connection({
		url: wampUrl,
		realm: wampRealm
	    });
	    
	    var wampIP = wampUrl.split("//")[1].split(":")[0];
	    //logger.info("WAMP SERVER IP: "+wampIP);
    
            //This function contains the logic 
            //that has to be performed if I'm connected to the WAMP server
            function manage_WAMP_connection (session, details){
                
                //Topic on which the board can send a message to be registered 
                var connectionTopic = 'board.connection';
                
                //Topic on which the board can listen for commands
                var commandTopic = 'board.command';
                
                //Read the board code from the configuration file
                var boardCode = nconf.get('config:board:code');
                
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
                
                
                //Function to manage messages received on the command topic
            }
            
            
            //This function is called as soon as the connection is created successfully
            wampConnection.onopen = function (session, details) {

                logger.info('WAMP: Connection to WAMP server '+ wampUrl + ' created successfully!');
                logger.info('WAMP: Connected to realm '+ wampRealm);
                logger.info('WAMP: Session ID: '+ session._id);
		//logger.info('Connection details: '+ JSON.stringify(details));
		
                //Calling the manage_WAMP_connection function that contains the logic 
                //that has to be performed if I'm connected to the WAMP server
                manage_WAMP_connection(session, details);
		
		//----------------------------------------------------------------------------------------------------
		// THIS IS AN HACK TO FORCE RECONNECTION AFTER A BREAK OF INTERNET CONNECTION
		//----------------------------------------------------------------------------------------------------
		/*
                setInterval(function(){
		  
		  if(session.isOpen){
		    session.publish('board.connection', ['alive']);
		  }
                    
                }, 5000);
		*/	
		
		setInterval(function(){
		    
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
   
                }, 5000);
		//----------------------------------------------------------------------------------------------------
		
		
            };
            
            //This function is called if there are problems with the WAMP connection
            wampConnection.onclose = function (reason, details) {
	      
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
            
            // Here the connection should be established or an error should have been raised --------
            
            //---------------------------------------------------------------------------------------
            
            
            //MEASURES --------------------------------------------------------------------------------------------
            //Even if I cannot connect to the WAMP server I can try to dispatch the alredy scheduled measures
            var manageMeasure = require('./manage-measures');
            manageMeasure.restartAllActiveMeasures();
            //-----------------------------------------------------------------------------------------------------

	    // PLUGINS RESTART ALL -------------------------------------------------------------------------------
	    //This procedure restarts all plugins in "ON" status
	    var managePlugins = require('./manage-plugins');
	    managePlugins.restartAllActivePlugins();
	    //----------------------------------------------------------------------------------------------------
			  
	    
        });
        
        //Here I cannot connect to the board      
      
    }
    
    function Main_Laptop(){
      	//Opening the connection to the WAMP server
	logger.info('WAMP: Opening connection to WAMP server ('+ wampIP +')...');  
	wampConnection.open();
        
        // Here the connection should be established or an error should have been raised --------
        
        //---------------------------------------------------------------------------------------
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