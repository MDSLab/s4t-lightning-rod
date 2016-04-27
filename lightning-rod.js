/*
 * 				  Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 * 
 * Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto
 * 
 * 
 */

//Loading configuration file
nconf = require('nconf');
nconf.file ({file: 'settings.json'});

var fs = require("fs");



//main logging configuration                                                                
log4js = require('log4js');
log4js.loadAppender('file');

logfile = nconf.get('config:log:logfile');
log4js.addAppender(log4js.appenders.file(logfile));               


//service logging configuration: "main"                                                  
var logger = log4js.getLogger('main');  

logger.info('##############################');  
logger.info('  Stack4Things Lightning-rod');  
logger.info('##############################');

try{
  
    loglevel = nconf.get('config:log:loglevel');

    /*
    OFF		nothing is logged
    FATAL	fatal errors are logged
    ERROR	errors are logged
    WARN	warnings are logged
    INFO	infos are logged
    DEBUG	debug infos are logged
    TRACE	traces are logged
    ALL		everything is logged
    */

    if (loglevel === undefined){
      logger.setLevel('INFO');
      logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO'); 
    }else{
      logger.setLevel(loglevel);
      logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel); 
    }
    
     

}
catch(err){
    logger.error('[SYSTEM] - Error in parsing loglevel parameter from settings.json: '+ err);
    logger.setLevel('INFO');
    logger.warn('[SYSTEM] - Log level applied: INFO');

}

 



servicesProcess = [];

//Reading information about the device from configuration file
var device = nconf.get('config:device');

//for connection test
//var isReachable = require('is-reachable');
var running = require('is-running');
var online = true;
active = true;
var keepWampAlive = null;
var tcpkill_pid = null;
var wamp_check = null;		// "false" = we need to restore the WAMP connection (with tcpkill). 
				// "true" = the WAMP connection is enstablished or the standard reconnection procedure was triggered by the WAMP client and managed by "onclose" precedure.


//Read the board code from the configuration file
boardCode = nconf.get('config:board:code');


//If the device has been specified
if (typeof device !== 'undefined'){

    logger.info('[SYSTEM] - DEVICE: ' + device);
    

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
	    logger.debug("[SYSTEM] - WAMP server IP: "+wampIP);
    

            //This function is called as soon as the connection is created successfully
            wampConnection.onopen = function (session, details) {
	      
		
		if (keepWampAlive != null){
		  
		  clearInterval( keepWampAlive );
		  logger.info('[WAMP-RECOVERY] - WAMP CONNECTION RECOVERED!');
		  logger.debug('[WAMP-RECOVERY] - Old timer to keep alive WAMP connection cleared!');
		  
		}
	      
		logger.info('[WAMP-STATUS] - Connection to WAMP server '+ wampUrl + ' created successfully:');
		logger.info('--> Realm: '+ wampRealm);
		logger.info('--> Session ID: '+ session._id);
		logger.debug('--> Connection details:\n'+ JSON.stringify(details));
		
		
		// RPC registration of Board Management Commands
		var manageBoard = require('./board-management');
		manageBoard.exportManagementCommands(session);
			
	
		var configFileName = './settings.json';
		var configFile = JSON.parse(fs.readFileSync(configFileName, 'utf8'));
		var board_config = configFile.config["board"];
		var board_status = board_config["status"];
		
		var board_config = configFile.config["board"];
		logger.info("[CONFIGURATION] - Board configuration parameters: " + JSON.stringify(board_config));
				
		//PROVISIONING: Iotronic sends coordinates to the new board	
		if(board_status === "new"){
		  
			logger.info('[CONFIGURATION] - NEW BOARD CONFIGURATION STARTED... ');
		
			session.call("s4t.board.provisioning", [boardCode]).then(
			  
			    function(result){

				logger.info("\n\nPROVISIONING "+boardCode+" RECEIVED: " + JSON.stringify(result) + "\n\n")
				
				board_position = result[0];
				board_config["position"]=result[0];
				board_config["status"]="registered";
				
				logger.info("\n[CONFIGURATION] - BOARD POSITION UPDATED: " + JSON.stringify(board_config["position"]))
				
				
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
		  
		      logger.info('[CONFIGURATION] - REGISTERED BOARD CONFIGURATION STARTING...');
		  
		      //Calling the manage_WAMP_connection function that contains the logic that has to be performed if I'm connected to the WAMP server
		      manageBoard.manage_WAMP_connection(session, details);
		  
		} else{
		  
		  logger.error('[CONFIGURATION] - WRONG BOARD STATUS: status allowed "new" or "registerd"!');
		  
		  
		}
     

		
		//----------------------------------------------------------------------------------------------------
		// THIS IS AN HACK TO FORCE RECONNECTION AFTER A BREAK OF INTERNET CONNECTION
		//----------------------------------------------------------------------------------------------------
		var connectionTester = require('connection-tester');
		
		keepWampAlive = setInterval(function(){
		  
		  
		    //NEW type of connection tester
		    connectionTester.test(wampIP, 8888, 1000, function (err, output) {
		      
			//logger.debug("[WAMP-STATUS] - CONNECTION STATUS: "+JSON.stringify(output));
			
			var reachable = output.success;
			var error_test = output.error;
			
			//logger.debug("[WAMP-STATUS] - CONNECTION STATUS: "+reachable);
			
			if(!reachable){
			  
			      logger.warn("[CONNECTION-RECOVERY] - INTERNET CONNECTION STATUS: "+reachable+ " - ERROR: "+error_test);
			      wamp_check = false;
			      online=false;
			  
			} else {
				
				try{
			  
					if(!online){
					  
					    logger.info("[CONNECTION-RECOVERY] - INTERNET CONNECTION STATUS: "+reachable);
					    logger.info("[CONNECTION-RECOVERY] - INTERNET CONNECTION RECOVERED!");

					    session.publish ('board.connection', [ 'alive-'+boardCode ], {}, { acknowledge: true}).then(
								
						  function(publication) {
							  logger.info("[WAMP-ALIVE-STATUS] - WAMP ALIVE MESSAGE RESPONSE: published -> publication ID is " + JSON.stringify(publication));
							  wamp_check = true;
							  
						  },
						  function(error) {
							  logger.warn("[WAMP-RECOVERY] - WAMP ALIVE MESSAGE: publication error " + JSON.stringify(error));
							  wamp_check = false;
						  }
															
					    );	
					    
					    //It will wait the WAMP alive message response
					    setTimeout(function(){
					    
						if (wamp_check){
						  
						    // WAMP CONNECTION IS OK
						  
						    logger.info("[WAMP-ALIVE-STATUS] - WAMP CONNECTION STATUS: " + wamp_check);
						    online=true;
						    
						}
						else{
						  
						      // WAMP CONNECTION IS NOT ESTABLISHED
						  
						      logger.warn("[WAMP-ALIVE-STATUS] - WAMP CONNECTION STATUS: " + wamp_check);
						      
						      // Check if the tcpkill process was killed after a previous connection recovery 
						      // Through this check we will avoid to start another tcpkill process
						      var tcpkill_status = running(tcpkill_pid);
						      logger.warn("[WAMP-ALIVE-STATUS] - TCPKILL STATUS: " + tcpkill_status + " - PID: " +tcpkill_pid);
						      
						      
						      //at LR startup "tcpkill_pid" is NULL and in this condition "is-running" module return "true" that is a WRONG result!
						      if (tcpkill_status === false || tcpkill_pid == null){ 
						      
							    logger.warn("[WAMP-RECOVERY] - Cleaning WAMP socket...");
							    
							    var tcpkill_kill_count = 0;
							    
							    var spawn = require('child_process').spawn;
					  
							    //tcpkill -9 port 8181
							    var tcpkill = spawn('tcpkill',['-9','port','8181']); 
							    
							    tcpkill.stdout.on('data', function (data) {
								logger.debug('[WAMP-RECOVERY] ... tcpkill stdout: ' + data);
							    });
							    
							    tcpkill.stderr.on('data', function (data) {
							      
								logger.debug('[WAMP-RECOVERY] ... tcpkill stderr:\n' + data);
								
							
								if(data.toString().indexOf("listening") > -1){
								  
								    // LISTENING
								    // To manage the starting of tcpkill (listening on port 8181)
								    logger.debug('[WAMP-RECOVERY] ... tcpkill listening...');
								  
								    tcpkill_pid = tcpkill.pid;
								    logger.debug('[WAMP-RECOVERY] ... tcpkill -9 port 8181 - PID ['+tcpkill_pid+']');
								    
								    
								}else if (data.toString().indexOf("win 0") > -1){
								  
								    // TCPKILL DETECT WAMP ACTIVITY (WAMP reconnection attempts)
								    // This is the stage triggered when the WAMP socket was killed by tcpkill and wamp reconnection process automaticcally started:
								    // in this phase we need to kill tcpkill to allow wamp reconnection.
								    tcpkill.kill('SIGINT');
								    
								    //double check: It will test after a while if the tcpkill process has been killed
								    setTimeout(function(){  
								      
									if (running(tcpkill_pid || tcpkill_pid == null)){

										tcpkill_kill_count = tcpkill_kill_count + 1;
										
										logger.warn("[WAMP-RECOVERY] ... tcpkill still running!!! PID ["+tcpkill_pid+"]");
										logger.debug('[WAMP-RECOVERY] ... tcpkill killing retry_count '+ tcpkill_kill_count);
										
										tcpkill.kill('SIGINT');
					      
									}
					
								    }, 3000);
								  
								}
								
								
							    });
			
							    
							    tcpkill.on('close', function (code) {
							      
								logger.debug('[WAMP-RECOVERY] ... tcpkill killed!');
								logger.info("[WAMP-RECOVERY] - WAMP socket cleaned!");
								
								online=true;
								
							    });
							    
							    
							    //online=true;
						      
						      }else{
							
							    logger.warn('[WAMP-RECOVERY] ...tcpkill already started!');
							
						      }
						      
						}
					    
					    
					    
					    
					    }, 2 * 1000);  //time to wait WAMP alive message response
					    
					}

				  
				}
				catch(err){
					logger.warn('[CONNECTION-RECOVERY] - Error keeping alive wamp connection: '+ err);
				}
				      
			}
			
		    });

		    
		    
		    /*DEPRECATED
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
		   
   
                }, 10 * 1000);
		
		logger.info('[WAMP] - TIMER to keep alive WAMP connection setup!');
		
		//----------------------------------------------------------------------------------------------------
		
		
            };
            
            //This function is called if there are problems with the WAMP connection
            wampConnection.onclose = function (reason, details) {
	      
		try{

		      wamp_check = true;  // IMPORTANT: for ethernet connections this flag avoid to start recovery procedure (tcpkill will not start!)
		      
		      logger.error('[WAMP-STATUS] - Error in connecting to WAMP server!');
		      logger.error('- Reason: ' + reason);
		      logger.error('- Reconnection Details: ');
		      logger.error("  - retry_delay:", details.retry_delay);
		      logger.error("  - retry_count:", details.retry_count);
		      logger.error("  - will_retry:", details.will_retry);

		      if(wampConnection.isOpen){
			  logger.info("[WAMP-STATUS] - connection is open!");
		      }
		      else{
			  logger.warn("[WAMP-STATUS] - connection is closed!");
		      }
		      
		      
		      

		}  
		catch(err){
		    logger.warn('[WAMP-STATUS] - Error in WAMP connection: '+ err);
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
        logger.info('[SYSTEM] - Board initialization...');  
        
        //Given the way linino lib is designed we first need to connect to the board and only then we can do anything else
        board.connect(function() {

            
            // CONNECTION TO WAMP SERVER --------------------------------------------------------------------------
            logger.info('[WAMP-STATUS] - Opening connection to WAMP server ('+ wampIP +')...');  
            wampConnection.open();
	    //-----------------------------------------------------------------------------------------------------

	    /*
	    // MEASURES management not supported yet
            //MEASURES --------------------------------------------------------------------------------------------
            //Even if I cannot connect to the WAMP server I can try to dispatch the alredy scheduled measures
            var manageMeasure = require('./manage-measures');
            manageMeasure.restartAllActiveMeasures();
            //-----------------------------------------------------------------------------------------------------
	    */
	    
	    // PLUGINS RESTART ALL -------------------------------------------------------------------------------
	    //This procedure restarts all plugins in "ON" status
	    var managePlugins = require('./manage-plugins');
	    //managePlugins.restartAllActivePlugins();  //DEPRECATED
	    managePlugins.pluginsLoader();
	    //----------------------------------------------------------------------------------------------------

	    
        });
         
      
    }
    
    
    
    function Main_Laptop(){
      
      	//Opening the connection to the WAMP server
	logger.info('[WAMP-STATUS] - Opening connection to WAMP server ('+ wampIP +')...');  
	wampConnection.open();
        
    }
    
    
	    
    switch(device){
      
	case 'arduino_yun':
	    logger.info("[SYSTEM] - L-R Arduino Yun starting...");
	    Main_Arduino_Yun();
	    break
	case 'laptop':
	    logger.info("[SYSTEM] - L-R laptop starting...");
	    Main_Laptop();
	    break                         
	case 'raspberry_pi':
	    logger.info("[SYSTEM] - L-R Raspberry Pi starting...");
	    break   	    
	default:
	    //DEBUG MESSAGE
	    logger.warn('[SYSTEM] - Device "' + device + '" not supported!');
	    logger.warn('[SYSTEM] - Supported devices are: "laptop", "arduino_yun", "raspberry_pi".');
	    process.exit();
	    break;
	    
	    
    }
    
    
    
    
}
else{
    logger.warn('[SYSTEM] - Please insert the kind of device in settings.json');
    process.exit();
}