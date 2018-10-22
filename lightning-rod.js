//############################################################################################
//##
//# Copyright (C) 2014-2018 Dario Bruneo, Francesco Longo, Andrea Rocco Lotronto, 
//# Giovanni Merlino, Nicola Peditto
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



// LIBRARIES
var fs = require("fs");
var spawn = require('child_process').spawn;
var running = require('is-running');			// We use this library to check if a process is running (PID check)
var autobahn = require('autobahn');
var connectionTester = require('connection-tester');


//settings parser
nconf = require('nconf');
SETTINGS = process.env.IOTRONIC_HOME+'/settings.json';
nconf.file ('config', {file: SETTINGS});
AUTH_CONF = '/etc/iotronic/authentication.json';
nconf.file ('auth', {file: AUTH_CONF});


//logging configuration: "board-management"
log4js = require('log4js');
logger = log4js.getLogger('main');

// Device settings
boardCode = null;		//valued in checkSettings
boardLabel = null;		//valued in checkSettings
board_position = null;	//valued by Iotronic (via updateConf, setConf or setBoardPosition RPCs)
reg_status = null;		//valued in checkSettings
device = null;			//valued in checkSettings
lyt_device = null;		//valued here in main
net_backend = '';
wampIP = null;
auth_lr_mode = null;


var wampConnection = null;

//WAMP SOCKETS RECOVERY HACK
wamp_socket_recovery = nconf.get('auth:wamp:wamp_socket_recovery');

if(wamp_socket_recovery == true || wamp_socket_recovery == "true"){

	//timing
	rpc_alive_time = nconf.get('auth:wamp:rpc_alive_time');
	if (isNaN(rpc_alive_time))
		rpc_alive_time = 60; //set default value

	check_skt_time = nconf.get('auth:wamp:check_skt_time');
	if (isNaN(check_skt_time))
		check_skt_time = 30; //set default value

	online = true;				// We use this flag during the process of connection recovery

	RECOVERY_SESSION = null;

	//timers
	keepWampAlive = null;		// It is a timer related to the function that every "X" seconds/minutes checks the connection status
	checkSocketTimer = null;	// It is a timer

	//timeout
	expectIotronicResponse = null;

	//trigger variable
	socketNotAlive = false;

}


// LR s4t libraries
var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;
var manageBoard = require(LIGHTNINGROD_HOME + '/modules/board-manager/board-management');
LR_VERSION = manageBoard.getLRversion();
LR_PID = process.pid;



//Init_Ligthning_Rod(function (check) {
manageBoard.Init_Ligthning_Rod(function (check) {


	if(check.result === "ERROR"){

		// Got a critical error in configuration file (settings.json)

		logger.error('[SYSTEM] - Logger configuration is wrong or not specified!');

		var log_template={log: {logfile: "<LOG-FILE>", loglevel: "<LOG-LEVEL>"}};
		logger.error("[SYSTEM] - Logger configuration expected: \n" + JSON.stringify(log_template, null, "\t"));
		
		process.exit();
		
	}
	else{

		// Configuration file is correctly configured... Starting LR...
		
		logger.info('[SYSTEM] - DEVICE: ' + device);

		//----------------------------------------
		// 1. Set WAMP connection configuration
		//----------------------------------------
		var wampUrl = url_wamp+":"+port_wamp+"/ws";

		wampIP = wampUrl.split("//")[1].split(":")[0];
		
		//var wampRealm = nconf.get('config:wamp:realm');
		var wampRealm = realm;

		logger.info("[SYSTEM] - Iotronic server IP: "+wampIP);


		wampConnection = new autobahn.Connection({
			url: wampUrl,
			realm: wampRealm,
			tlsConfiguration: {},
			max_retries: -1
		});

		logger.info("[SYSTEM] - WAMP server IP: " + wampIP);

		logger.info("[SYSTEM] - Board ID: " + boardCode);
		logger.info("[SYSTEM] - Board label: " + boardLabel);

		logger.debug("[SYSTEM] - WAMP socket recovery: " + wamp_socket_recovery);



		//----------------------------------------------------------------------------------------
		// 3. On WAMP connection open the device will load LR libraries and start each LR module
		//----------------------------------------------------------------------------------------
		//This function is called as soon as the connection is created successfully
		wampConnection.onopen = function (session, details) {

			logger.info('[WAMP] - Connection to WAMP server '+ wampUrl + ' created successfully:');
			logger.info('[WAMP] |--> Realm: '+ wampRealm);
			logger.info('[WAMP] |--> Session ID: '+ session._id);
			//logger.debug('[WAMP] |--> Connection details:\n'+ JSON.stringify(details));
			logger.info('[WAMP] |--> socket check timing: '+ wamp_socket_recovery + " - Timing: " + rpc_alive_time + " seconds");

			//--WAMP-RECOVERY-SYSTEM-INIT-------------------------------------------------------------------------------
			if(wamp_socket_recovery == true || wamp_socket_recovery == "true") {

				RECOVERY_SESSION = session;
				socketNotAlive = false;

				if (expectIotronicResponse != null) {

					clearTimeout(expectIotronicResponse);
					logger.debug('[WAMP-RECOVERY] - Check socket timers cleared!');

				}

			}
			//----------------------------------------------------------------------------------------------------------


			// Test if IoTronic is connected to the realm
			session.call("s4t.iotronic.isAlive", [boardCode]).then(

				function(response){

					logger.info("[SYSTEM] - " + response.message );

					// RPC registration of Board Management Commands
					manageBoard.IotronicLogin(session);

					if(wamp_socket_recovery == true || wamp_socket_recovery == "true"){


						if (keepWampAlive != null){

							logger.info('[WAMP-RECOVERY] - WAMP CONNECTION RECOVERED!');

							//We trigger this event after a connection recovery: we are deleting the previous timer
							clearInterval( keepWampAlive );

							if (checkSocketTimer != null){

								clearInterval( checkSocketTimer );

							}

							logger.debug('[WAMP-RECOVERY] - Old timers cleared!');

						}



						// The function managed by setInterval checks the connection status every "X" TIME
						keepWampAlive = setInterval(function(){


							// connectionTester: library used to check the reachability of Crossbar-Wamp-Broker (timeout check set to 10 seconds)
							connectionTester.test(wampIP, port_wamp, 10000, function (err, output) {

								var reachable = output.success;
								var error_test = output.error;

								if(!reachable){

									//CONNECTION STATUS: FALSE
									logger.warn("[CONNECTION-RECOVERY] - INTERNET CONNECTION STATUS: " + reachable + " - Error: " + error_test);
									online = false;

								} else {

									if(!online){
										// In the previous checks the "online" flag was set to FALSE.
										logger.info("[CONNECTION-RECOVERY] - INTERNET CONNECTION RECOVERED");
										online = true;
									}
									//logger.debug("[CONNECTION-TEST] - INTERNET CONNECTION STATUS: " + reachable + " - Error: " + error_test);

									//CONNECTION COMEBACK AVAILABLE - STATUS: TRUE
									expectIotronicResponse = setTimeout(function(){

										logger.warn("[WAMP-RECOVERY] - No Iotronic response, socket restoring...");

										socketNotAlive = true;   //trigger the 'checkSocketTimer' procedure that will clean the zombie-wamp-socket

									}, 5000);

									try{

										// Test if IoTronic is connected to the realm
										RECOVERY_SESSION.call("s4t.iotronic.isAlive", [boardCode]).then(

											function(response){

												// WAMP connection is OK
												clearTimeout(expectIotronicResponse);
												//logger.info("[WAMP-ALIVE] - WAMP CONNECTION STATUS: " + response.message);
												socketNotAlive = false;

											},
											function (err) {

												// WAMP connection is OK but I got an error on RPC communication
												clearTimeout(expectIotronicResponse);
												logger.warn("[WAMP-RECOVERY] - WAMP CONNECTION STATUS: " + JSON.stringify(err));

											}

										);


									}
									catch(err){
										logger.warn('[CONNECTION-RECOVERY] - Error keeping alive wamp connection: '+ err);
									}


								}

							});





						}, rpc_alive_time * 1000);



						checkSocketTimer = setInterval(function(){

							if(socketNotAlive == true){

								logger.warn("[WAMP-RECOVERY] - GDB - Start socket cleaning...");

								var cp = require('child_process');
								var gdb = cp.fork(LIGHTNINGROD_HOME + '/modules/board-manager/wamp_recovery.js', [LR_PID, port_wamp]);

								gdb.on('message', function(msg) {

									if(msg != undefined){

										if (msg.result === "SUCCESS"){
											logger.info("[WAMP-RECOVERY] - GDB - " + msg.message);
										}
										else{
											logger.warn("[WAMP-RECOVERY] - GDB - " + msg.message);
										}
									}

								});


								/*

								// Check if the tcpkill process was killed after a previous connection recovery through this check we will avoid to start another tcpkill process
								var tcpkill_status = running(tcpkill_pid);
								logger.warn("[WAMP-RECOVERY] - TCPKILL STATUS: " + tcpkill_status + " - PID: " + tcpkill_pid);

								// at LR startup "tcpkill_pid" is NULL and in this condition "is-running" module return "true" that is a WRONG result!
								if (tcpkill_status === false || tcpkill_pid == null){

									logger.warn("[WAMP-RECOVERY] - TCPKILL - Cleaning WAMP zombie-socket...");

									var tcpkill_kill_count = 0;

									//e.g.: tcpkill -9 port 8181
									tcpkill = spawn('tcpkill',['-9','port', port_wamp]);
									tcpkill_pid = tcpkill.pid;

									tcpkill.stdout.on('data', function (data) {
										logger.debug('[WAMP-RECOVERY] ... tcpkill stdout: ' + data);
									});

									tcpkill.stderr.on('data', function (data) {

										logger.debug('[WAMP-RECOVERY] ... tcpkill stderr:\n' + data);

										//it will check if tcpkill is in listening state on the port 8181
										if(data.toString().indexOf("listening") > -1){

											// LISTENING: to manage the starting of tcpkill (listening on port 8181)

										}else if (data.toString().indexOf("win 0") > -1){

											// TCPKILL DETECTED WAMP ACTIVITY (WAMP reconnection attempts)
											// This is the stage triggered when the WAMP socket was killed by tcpkill and WAMP reconnection process automaticcally started:
											// in this phase we need to kill tcpkill to allow WAMP reconnection.
											try{

												logger.debug('[WAMP-RECOVERY] ... killing tcpkill process with PID: ' + tcpkill_pid);
												tcpkill.kill('SIGKILL'); //process.kill(tcpkill_pid);

												//double check: It will test after a while if the tcpkill process has been killed, OTHERWISE reboot board.
												setTimeout(function(){

													if ( running(tcpkill_pid)){

														//manageBoard.execAction(['reboot']);
														tcpkill.kill('SIGKILL'); //process.kill(tcpkill_pid);
														//wampConnection.close();

													}

												}, 2000);


											}catch (e) {

												logger.error('[WAMP-RECOVERY] ... tcpkill killing error: ', e);

											}


										}


									});

									tcpkill.on('close', function (code) {

										logger.debug('[WAMP-RECOVERY] ... tcpkill killed [code: '+code+']');
										logger.info("[WAMP-RECOVERY] - WAMP socket cleaned!");

										//The previous WAMP socket was KILLED and the automatic WAMP recovery process will start
										//so the connection recovery is completed and "online" flag is set again to TRUE
										online = true;
										socketNotAlive = false;
										clearTimeout(expectIotronicResponse);

									});


								}
								else{
									logger.warn('[WAMP-RECOVERY] ...tcpkill already started!');
								}

								*/


							}


						}, check_skt_time * 1000);  




						logger.debug('[WAMP] - TIMERS to keep alive WAMP connection set up!');




					}


				},
				function (err) {
					
					// IoTronic is not connected to the realm yet so LR need to try to reconnect later
					logger.error("[SYSTEM] - IoTronic is not online: " + JSON.stringify(err) );
					//if (err.error !== 'wamp.error.no_such_procedure') {}
					logger.warn("[SYSTEM] - Lightning-rod reconnecting...");

					wampConnection.close();

					setTimeout(function(){
						wampConnection.open();
					}, 10 * 1000);  //time to wait for the next reconnection attempt


				}

			);




		};

		
		//-------------------------------
		// 4. On WAMP connection close
		//-------------------------------
		//This function is called if there are problems with the WAMP connection
		wampConnection.onclose = function (reason, details) {

			try{

				logger.error('[WAMP] - Error in connecting to WAMP server!');
				logger.error('- Reason: ' + reason);
				logger.error('- Reconnection Details: ');
				logger.error("  - retry_delay:", details.retry_delay);
				logger.error("  - retry_count:", details.retry_count);
				logger.error("  - will_retry:", details.will_retry);

				if(wampConnection.isOpen){
					logger.info("[WAMP] - connection is open!");
				}
				else{
					logger.warn("[WAMP] - connection is closed!");
				}

			}
			catch(err){
				logger.warn('[WAMP] - Error in WAMP connection: '+ err);
			}


		};


		//--------------------------------------------------------------
		// 2. The selected device will connect to Iotronic WAMP server
		//--------------------------------------------------------------
		try{
			
			IoT_Device = require('./device/lyt_'+device);
			lyt_device = new IoT_Device(device);
			logger.info("[SYSTEM] - Lightning-rod "+ lyt_device.name +" starting...");
			lyt_device.Main(wampConnection, logger);

		}
		catch (e) {

			logger.error('[SYSTEM] - Loading IoT device failure: ', e);
			logger.error('[SYSTEM] - Device "' + device + '" not supported!');
			logger.error('[SYSTEM] - Supported devices are: "server", "arduino_yun", "raspberry_pi".');
			logger.info("Bye!");
			process.exit(1);

		}


		//--------------------------------------------------------------
		// 5. Load Module Manager
		//--------------------------------------------------------------

		manageBoard.moduleLoaderOnBoot();




	}
	
	
});




