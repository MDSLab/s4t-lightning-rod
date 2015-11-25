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
log4js.addAppender(log4js.appenders.file('/var/log/s4t-lightning-rod.log '));            

//service logging configuration: "main"                                                  
var logger = log4js.getLogger('main');                                                   
logger.info('Starting Lightning-rod...');  

servicesProcess = [];
socatClient = [];
rtClient = [];
greDevices = [];

//Reading information about the device from configuration file
var device = nconf.get('config:device');

//If the device has been specified
if (typeof device !== 'undefined'){
    
    logger.info('The device is ' + device);
    //console.log('The device is ' + device);
    
    //If I'm on a Arduino Yun
    if (device == 'arduino_yun'){
    
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
        
        //Given the way linino lib is designed we first need to connect to the board 
        //and only then we can do anything else
        board.connect(function() {
            
            //WAMP ---------------------------------------------------------------------------------
            
            var autobahn = require('autobahn');
            var wampUrl = nconf.get('config:wamp:url_wamp')+":"+nconf.get('config:wamp:port_wamp')+"/ws";
            var wampRealm = nconf.get('config:wamp:realm');
            var wampConnection = new autobahn.Connection({
                url: wampUrl,
                realm: wampRealm
            });
            
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
                logger.info('Sending board ID ' + boardCode + ' to topic ' + connectionTopic + ' to register the board');
                //console.log('Sending board ID ' + boardCode + ' to topic ' + connectionTopic + ' to register the board');
                session.publish(connectionTopic, [boardCode, 'connection', session._id]);
                
                //Subscribing to the command topic to receive messages for asyncronous operation to be performed
                //Maybe everything can be implemented as RPCs
                //Right now the onCommand method of the manageCommands object is invoked as soon as a message is received on the topic
                logger.info('Registering to command topic ' + commandTopic);
                //console.log('Registering to command topic ' + commandTopic);
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
                logger.info('Connection to WAMP server '+ wampUrl + ' created successfully!');
                logger.info('Connected to realm '+ wampRealm);
                //console.log('Connection to WAMP server '+ wampUrl + ' created successfully!');
                //console.log('Connected to realm '+ wampRealm);
                
                //Calling the manage_WAMP_connection function that contains the logic 
                //that has to be performed if I'm connected to the WAMP server
                manage_WAMP_connection(session, details);
		
		
		//PLUGINS -------------------------------------------------------------------------------
		//This procedure restarts all plugins in "ON" status
		var managePlugins = require('./manage-plugins');
		managePlugins.restartAllActivePlugins();
		//---------------------------------------------------------------------------------------
	    
	    

                //THIS IS AN HACK TO FORCE RECONNECTION AFTER A BREAK OF INTERNET CONNECTION
                setInterval(function(){
                    session.publish('board.connection', ['alive']);
                },5000);
            };
            
            //This function is called if there are problems with the WAMP connection
            wampConnection.onclose = function (reason, details) {
                logger.error('Error in connecting to WAMP server!');
                logger.error('Reason: ' + reason);
                logger.error('Details: ');
                logger.error(details);
                
                //console.log('Error in connecting to WAMP server!');
                //console.log('Reason: ' + reason);
                //console.log('Details: ');
                //console.dir(details);
            };
            
            //Opening the connection to the WAMP server
            logger.info('Opening connection to WAMP server...');  
            //console.log("Opening connection to WAMP server...");
            wampConnection.open();
            
            //Here the connection should be established or an error should have been raised
            
            //---------------------------------------------------------------------------------------
            
            
            //MEASURES ------------------------------------------------------------------------------
            //Even if I cannot connect to the WAMP server I can try to dispatch the alredy scheduled measures
            var manageMeasure = require('./manage-measures');
            manageMeasure.restartAllActiveMeasures();
            //---------------------------------------------------------------------------------------
	    
	    
	    

            
            
	    
	    
        });
        
        //Here I cannot connect to the board
    }
    else if (device == 'laptop'){
        
        //WAMP ---------------------------------------------------------------------------------
        var autobahn = require('autobahn');
	var wampUrl = nconf.get('config:wamp:url_wamp')+":"+nconf.get('config:wamp:port_wamp')+"/ws";
        var wampRealm = nconf.get('config:wamp:realm');
        var wampConnection = new autobahn.Connection({
            url: wampUrl,
            realm: wampRealm
        });
        
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
            console.log('Sending board ID ' + boardCode + ' to topic ' + connectionTopic + ' to register the board');
            session.publish(connectionTopic, [boardCode, 'connection', session._id]);
            
            //Subscribing to the command topic to receive messages for asyncronous operation to be performed
            //Maybe everything can be implemented as RPCs
            //Right now the onCommand method of the manageCommands object is invoked as soon as a message is received on the topic
            console.log('Registering to command topic ' + commandTopic);
            var manageCommands = require('./manage-commands');
            session.subscribe(commandTopic, manageCommands.onCommand);
            
            //If I'm connected to the WAMP server I can receive plugins to be scheduled as RPCs
            var managePlugins = require('./manage-plugins');
            managePlugins.exportPluginCommands(session);
            
        }            
        
        //This function is called as soon as the connection is created successfully
        wampConnection.onopen = function (session, details) {
            console.log('Connection to WAMP server '+ wampUrl + ' created successfully!');
            console.log('Connected to realm '+ wampRealm);
            
            //Calling the manage_WAMP_connection function that contains the logic 
            //that has to be performed if I'm connected to the WAMP server
            manage_WAMP_connection(session, details);
            
            //THIS IS AN HACK TO FORCE RECONNECTION AFTER A BREAK OF INTERNET CONNECTION
            setInterval(function(){
                session.publish('board.connection', ['alive']);
            },5000);
            
        };
        
        //This function is called if there are problems with the WAMP connection
        wampConnection.onclose = function (reason, details) {
            console.log('Error in connecting to WAMP server!');
            console.log('Reason: ' + reason);
            console.log('Details: ');
            console.dir(details);
        };
        
        //Opening the connection to the WAMP server
        console.log("Opening connection to WAMP server...");
        wampConnection.open();
        
        //Here the connection should be established or an error should have been raised
        
        //---------------------------------------------------------------------------------------
        
    }
    else{
        console.log('Device "' + device + '" not supported!');
        console.log('Supported devices are: "laptop", "arduino_yun", "raspberry_pi".');
    }
}
else{
    console.log('Please insert the kind of device in settings.json');
    process.exit();
}