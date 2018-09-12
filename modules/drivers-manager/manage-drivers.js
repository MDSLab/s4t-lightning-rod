//############################################################################################
//##
//# Copyright (C) 2014-2018 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
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

//service logging configuration: "manageDrivers"   
var logger = log4js.getLogger('manageDrivers');
logger.setLevel(loglevel);

var fs = require('fs');
var fuse = require('fuse-bindings');
var Q = require("q");
var util = require('util');

var session_drivers = null;
var boardCode = nconf.get('config:board:code');
var drivers = []; // List of drivers mounted in the board
//var device0_file = '/sys/bus/iio/devices/iio:device0/enable';

file_list = {};
mp_list = {};
driver_name = "";
fd_index = 3; //fd index used by Unix as file descriptor: we can use this index starting from 3

mode_lookup_table = {
  rw: 33188, 	//rw-r--r-- 100644
  r: 33060		//r--r--r-- 100444
};


var DRIVERS_SETTING = process.env.IOTRONIC_HOME + '/drivers/drivers.json';
var DRIVERS_STORE = process.env.IOTRONIC_HOME + '/drivers/';
var MP_DRIVERS = process.env.IOTRONIC_HOME + "/drivers/mountpoints/";


// RPC to mount all enabled drivers ("autostart" flag set at true) every LR restarting.
// In particular:
// - at LR starting: each enabled driver will be mounted (by fuse)
// - after a Internet/WAMP connection recovery we don't mount again each enabled driver (because it is already mounted) but we will only declare/register again the RPC functions.
exports.restartDrivers = function (){
  
    logger.info('[DRIVER] - Drivers loader is running!');

    try{
      
	  	// Get the driver's configuration.
	  	var driversConf = JSON.parse(fs.readFileSync(DRIVERS_SETTING, 'utf8'));
	  	var drivers_keys = Object.keys( driversConf["drivers"] );
		var driver_num = drivers_keys.length;
	  	logger.debug('[DRIVER] - Number of installed drivers: '+ driver_num);

		if(driver_num > 0){
			
			logger.info('[DRIVER] - Restarting enabled drivers on board...');

			for(var i = 0; i < driver_num; i++) {

				(function(i) {

					setTimeout( function() {

						var driver_name = drivers_keys[ i ];
						var autostart = driversConf.drivers[driver_name].autostart;
						var status = driversConf.drivers[driver_name].status;
						var remote = driversConf.drivers[driver_name].remote;
						var mirror_board = driversConf.drivers[driver_name].mirror_board;

						logger.info( '[DRIVER] |--> '+ driver_name + ' - status: '+ status +' - autostart: '+autostart+ ' - remote: { '+remote+' , '+mirror_board+' }');

						//After a connection recovery we will don't mount a driver with status "unmounted" even if it has the "autostart" flag set at true
						if(reconnected == true && status === "unmounted"){

							logger.debug("[DRIVER] - "+driver_name+" --> It is not necessary restart this driver after reconnection!");

							// We must reset the "reconnected" flag at false in order to set like completed the connection recovery procedure from driver point of view when all drivers hava been analyzed
							if ( i === (driver_num - 1) ) {

								reconnected = false;
								logger.debug("[DRIVER] - " + driver_name + " --> reconnected flag reset to false...");
							}


						} else{



							if(autostart === "true" && remote != null){

								if (status === "mounted"){

									logger.debug("[DRIVER] - "+driver_name+" --> Restarting already mounted driver...");


									exports.unmountDriver([driver_name, true ]).then(

										function(result){

											logger.debug("[DRIVER] - "+driver_name+" --> Unmounting result: "+ JSON.stringify(result));

											session_drivers.call('s4t.board.driver.updateStatus', [boardCode, driver_name, "unmounted"]).then(

												function(result){

													logger.debug("[DRIVER] - "+driver_name+" --> DB unmounting result: "+ JSON.stringify(result));

													setTimeout( function() {

														exports.mountDriver([driver_name, remote, mirror_board]).then(

															function(result){

																// We must reset the "reconnected" flag at false in order to set like completed the connection recovery procedure from driver point of view when all drivers hava been analyzed
																if ( reconnected === true && i === (driver_num - 1) ) {

																	reconnected = false;
																	logger.debug("[DRIVER] - " + driver_name + " --> reconnected flag reset to false...");
																}

																logger.debug("[DRIVER] - "+driver_name+" --> Mounting result: "+ JSON.stringify(result));

																session_drivers.call('s4t.board.driver.updateStatus', [boardCode, driver_name, "mounted"]).then(

																	function(result){

																		logger.debug("[DRIVER - "+driver_name+" --> DB mounting result: "+ JSON.stringify(result));

																	},
																	function (error) {
																		logger.debug("[DRIVER] - "+driver_name+" --> DB mounting error: "+ JSON.stringify(error));
																	}

																);

															},
															function (error) {

																//logger.warn("[DRIVER] - "+driver_name+" --> Mounting error: "+ JSON.stringify(error));
																logger.warn("[DRIVER] - "+driver_name+" --> Mounting driver aborted!");

																// We must reset the "reconnected" flag at false in order to set like completed the connection recovery procedure from driver point of view when all drivers hava been analyzed
																if ( reconnected === true && i === (driver_num - 1) ) {

																	reconnected = false;
																	logger.debug("[DRIVER] - " + driver_name + " --> reconnected flag reset to false...");
																}

															}


														);

													}, 1000*i);



												},
												function (error) {
													logger.warn("[DRIVER] - "+driver_name+" --> DB unmounting error: "+ JSON.stringify(error));

												}

											);


										},
										function (error) {
											logger.warn("[DRIVER] - "+driver_name+" --> Unmounting error: "+ JSON.stringify(error));

											// We must reset the "reconnected" flag at false in order to set like completed the connection recovery procedure from driver point of view when all drivers hava been analyzed
											if ( reconnected === true && i === (driver_num - 1) ) {
												reconnected = false;
												logger.debug("[DRIVER] - " + driver_name + " --> reconnected flag reset to false...");
											}

										}


									);


								}else{


									logger.debug("[DRIVER] - "+driver_name+" --> Restarting unmounted driver...");

									exports.mountDriver([driver_name, remote, mirror_board]).then(

										function(result){

											logger.debug("[DRIVER] - "+driver_name+" --> Mounting result: "+ JSON.stringify(result));

											session_drivers.call('s4t.board.driver.updateStatus', [boardCode, driver_name, "mounted"]).then(

												function(result){
													logger.debug("[DRIVER] - "+driver_name+" --> DB mounting result: "+ JSON.stringify(result));
												},
												function (error) {
													logger.debug("[DRIVER] - "+driver_name+" --> DB mounting error: "+ JSON.stringify(error));
												}

											);

										},
										function (error) {
											logger.warn("[DRIVER] - "+driver_name+" --> Mounting error: "+ JSON.stringify(error));
										}


									);


								}

							}else{
								logger.info("[DRIVER] - " + driver_name + ": this driver does not have to be started!");
							}
						}


					}, 2000*i);

				})(i);

			}

		}else{
			logger.info('[DRIVER] - No enabled drivers to be restarted!');
		}

	}
    catch(err){
		logger.warn("[DRIVER] - "+driver_name+" --> Error parsing drivers.json: "+ err);
    }

};


// RPC allows to read the value of a file remotely.
// This remote call function is used in two cases:
// - REMOTE - FALSE: the cloud sends a request to know the content of a local file
// - REMOTE - TRUE:  when this board mounts a mirrored driver and needs to send a RPC read request to the board that owns the hardware.
exports.readRemote = function (args){

	var d = Q.defer();

	var driver_name = String(args[0]);
	var filename = String(args[1]);

	driver_mp_node = mp_list[driver_name];

	var driver = drivers[driver_name];
	var remote = driver_mp_node['/'].remote;
	var mirror_board = driver_mp_node['/'].mirror_board;

  	if (remote === "false" || remote === "null"){
    
		driver[ driver_mp_node['/'+filename].read_function ](
      
	  	function(read_content){

		  var buffer = new Buffer(read_content.toString(), 'utf-8');
		  var str = ''+buffer.slice(0);
		  if (!str)
		  	return d.resolve(0);

		  logger.info('[DRIVER] - '+driver_name+' - REMOTE READ: ['+filename+'] -> '+ str);
		  d.resolve(str);
		    
	  	}
	
      ); 
      

  	}else{

		var read_rpc_call = 's4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.read';
      
      	logger.debug('[DRIVER] - '+driver_name+' - REMOTE READ CALLING to '+mirror_board + ' RPC called: '+ read_rpc_call);
      
      	session_drivers.call( read_rpc_call, [driver_name, filename]).then(
				
			function(read_content){

				var buffer = new Buffer(read_content.toString(), 'utf-8');
				var str = ''+buffer.slice(0);
				if (!str)
					return d.resolve(0);
				logger.info('[DRIVER] - '+driver_name+' - MIRRORED REMOTE READ from '+mirror_board+': ['+filename+'] -> '+ str);
				d.resolve(str);

			},
			function (error) {
				// call failed
				logger.warn('[DRIVER] - '+driver_name+' - MIRRORED REMOTE READ from '+mirror_board+' failed! - Error: '+ JSON.stringify(error));
				var error_log = "ERROR: " + error["error"];
				d.resolve( error_log );
			}

      	);
    
  }
  
    
  return d.promise;
    
};


// RPC allows to write a file remotely.
// This remote call function is used in two cases:
// - REMOTE - FALSE: the cloud sends a request to write in a local file
// - REMOTE - TRUE:  when this board mounts a mirrored driver and needs to send a RPC write request to the board that owns the hardware.
exports.writeRemote = function (args){

	var d = Q.defer();
	
	var driver_name = String(args[0]);
	var filename = String(args[1]);
	var filecontent = String(args[2]); 
	
	driver_mp_node = mp_list[driver_name];  
	
	var driver = drivers[driver_name];
	var remote = driver_mp_node['/'].remote;
	var mirror_board = driver_mp_node['/'].mirror_board;

	if (remote != "true"){
    
		driver[ driver_mp_node['/'+filename].write_function ]( filecontent, function(){
		  
			if ( loglevel === "info"){
				logger.info('[DRIVER] - '+driver_name+' - REMOTE WRITE: ['+filename+'] -> completed!');
			}
		  
			logger.debug('[DRIVER] - '+driver_name+' - REMOTE WRITE: ['+filename+'] <- '+filecontent);
		  
		  	d.resolve("writing completed");
		
		});
      

	} else{

		var write_rpc_call = 's4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.write';
      
		logger.debug('[DRIVER] - '+driver_name+' - REMOTE WRITE CALLING to '+mirror_board + ' RPC called: '+ write_rpc_call);
      
		session_drivers.call(write_rpc_call, [driver_name, filename, filecontent]).then(
				
			function(result){
			
			  logger.info('[DRIVER] - '+driver_name+' - MIRRORED REMOTE WRITE from '+mirror_board+': ['+filename+'] -> '+ result);
			  d.resolve(result);
			
			},
			function (error) {
			  // call failed
			  logger.warn('[DRIVER] - '+driver_name+' - MIRRORED REMOTE WRITE from '+mirror_board+' failed! - Error: '+ JSON.stringify(error));
			  var error_log = "ERROR: " + error["error"];
			  d.resolve( error_log );
			}
		);	
    
	}
  
    
	return d.promise;
    
};


// Stub RPC to used for the files that don't have an implemented read/write function.
exports.NotAllowedRemoteFunction = function (args){
  
  return "Remote operation not allowed!"
  
  
};


// RPC to mount a driver
exports.mountDriver = function (args){
      
    //Parsing the input arguments
    var driver_name = String(args[0]);
    var remote = String(args[1]);
    var mirror_board = String(args[2]);
    
    var d = Q.defer();
      
    logger.info("[DRIVER] - MOUNTING driver '"+driver_name+"'...");
    logger.debug("[DRIVER] - "+driver_name+" --> Parameters:\n - remote: "+remote+"\n - mirror_board: " + mirror_board);
    
    var rest_response = {};
	
    var mountpoint = MP_DRIVERS + driver_name;
    
    logger.debug("[DRIVER] - "+driver_name+" --> Driver folder ("+mountpoint+") checking...");
    
    try{

		fs.stat(mountpoint,

			function (stats) {

				if(stats != null){

                    if(stats['code'] === "ENOENT") {
                        logger.debug("[DRIVER] - " + driver_name + " ----> folder " + mountpoint + " does not exist!");
                        logger.debug("[DRIVER] - " + driver_name + " --> First driver mounting (reconnected = " + reconnected + ")");
                        MountpointCreation(driver_name, mountpoint, remote, mirror_board, d);
                    }

				}else{

                    logger.debug("[DRIVER] - "+driver_name+" ----> folder "+mountpoint+" exists!");
					//logger.debug("[DRIVER] - " + driver_name + " --> Mountpoint details:\n" + util.inspect(stats));
					logger.debug("[DRIVER] - " + driver_name + " --> Driver WAMP status: reconnected = " + reconnected );

					AttachMountpoint(driver_name, mountpoint, remote, mirror_board, d);
				}


			},
			function(err) {

				rest_response.message = "Error during driver folder creation: " + err;
				rest_response.result = "ERROR";
				logger.error("[DRIVER] - "+driver_name+" --> "+rest_response.message);
				d.resolve(rest_response);
				
			}

		);

	  
    } catch (err) {
		rest_response.message = "Error during driver folder creation: " + err;
		rest_response.result = "ERROR";
		logger.error("[DRIVER] - "+driver_name+" --> "+rest_response.message);
		d.resolve(rest_response);
    }
	
  
    return d.promise;

};


// RPC to unmount a driver
exports.unmountDriver = function (args){

	//Parsing the input arguments
	var driver_name = String(args[0]);

	if(String(args[1]) != undefined){
		var restarting = String(args[1]);
	}

	var d = Q.defer();

	var result = "None";

	var rest_response = {};

	var mountpoint = MP_DRIVERS + driver_name;

	logger.info("[DRIVER] - UNMOUNTING driver '"+driver_name+"'...");

	var driver_path = DRIVERS_STORE+driver_name;
	var driver_conf = driver_path+"/"+driver_name+".json";
	var driver_module = driver_path+"/"+driver_name+".js";

	try{

		var driverlib = require(driver_module);

		driverlib['finalize']( function(end_result){

			logger.info("[DRIVER] - "+driver_name+" --> " + end_result);

			try{

				logger.debug("[DRIVER] - "+driver_name+" --> Loading driver configuration...");

				var driverJSON = JSON.parse(fs.readFileSync(driver_conf, 'utf8'));
				var file_node = driverJSON.children;

				logger.debug('[DRIVER] - '+driver_name+' --> JSON file '+ driver_name +'.json successfully parsed!');

				// This control is necessary during the restarting procedures of LR (or after a network failure) when all drivers, "autostart enabled, need to be restarted.
				// If the restarting procedure is called:
				// - at LR boot (reconnected flag is FALSE) we need to unmount the drivers that were mounted in a previous instance of LR;
				// - after a connection failure (reconnected flag is TRUE) we don't need to unmount the driver in order to keep trasparent from user's point of view the network failure
				if ( reconnected === false ){

					logger.debug('[DRIVER] - '+driver_name+' --> Unmounting with reconnected flag = false');

					fuse.unmount(mountpoint, function (err) {

						if(err === undefined){

							UnRegister(driver_name, file_node, restarting, rest_response, d, function(unreg_result){

								logger.debug('[DRIVER] - '+driver_name+' --> '+JSON.stringify(unreg_result));

								manageDriversConf("update", driver_name, null, "unmounted", null, null, function(mng_result){

									logger.debug("[DRIVER] - "+driver_name+" --> " + mng_result.message);

									rest_response.message = "Driver '"+driver_name+"' successfully unmounted!";
									rest_response.result = "SUCCESS";
									logger.info("[DRIVER] - "+driver_name+" --> "+rest_response.message);
									d.resolve(rest_response);

								});

							});

						}else{

							rest_response.message = "ERROR during '"+driver_name+"' (fuse) unmounting: " +err;
							rest_response.result = "ERROR";
							logger.error("[DRIVER] - "+driver_name+" --> "+JSON.stringify(rest_response.message));
							d.resolve(rest_response);

						}

					});

				}else{
					logger.debug('[DRIVER] - '+driver_name+' --> Unmounting with reconnected flag = true');

					rest_response.message = "Driver '"+driver_name+"' no need to unmount after reconnection!";
					rest_response.result = "SUCCESS";
					logger.info("[DRIVER] - "+driver_name+" --> "+rest_response.message);
					d.resolve(rest_response);
				}





			}
			catch(err){
				logger.error("[DRIVER] - "+driver_name+" --> Error during driver configuration loading: "+err);
				d.resolve(err);
			}

		});

	}
	catch(err){
		rest_response.message = "Generic error during '"+driver_name+"' (fuse) unmounting: " +err;
		rest_response.result = "ERROR";
		logger.error("[DRIVER] - "+driver_name+" --> "+ rest_response.message);
		d.resolve(err);
	}

	return d.promise;

};


// RPC to inject a driver in the board: it is called (via RPC) from the Cloud side to manage a driver injection
exports.injectDriver = function (args){

    // Parsing the input arguments
    var driver_name = String(args[0]);
    var driver_code = String(args[1]);
    var driver_schema = String(args[2]);
    var autostart = String(args[3]);  // The autostart parameter is used to set the boot execution configuration of the driver.

	logger.info("[DRIVER] - INJECTING driver '" + driver_name + "'...");

    var d = Q.defer();
    var rpc_result = "";
    
    // Writing the driver's files (code and json schema)
    var driver_folder = DRIVERS_STORE+driver_name;
    var driver_file_name = driver_folder+'/' + driver_name + '.js';  
    var driver_schema_name = driver_folder+'/' + driver_name + '.json';


	logger.debug("[DRIVER] - " + driver_name + " - Checking driver environment...");

	cleanDriverData(driver_name).then(

		function (clean_res) {

			if (clean_res.result == "SUCCESS"){

				logger.debug("[DRIVER] - " + driver_name + " --> driver environment is clean!");


				if (loglevel !== "debug" && loglevel !== "DEBUG")
					logger.info("[DRIVER] - Called RPC injectDriver with: driver_name = " + driver_name + ", autostart = " + autostart);
				else
					logger.info("[DRIVER] - Called RPC injectDriver with: \n - driver_name = " + driver_name + "\n - autostart = " + autostart + "\n - driver_code = \n###############################################################################\n" + driver_code + "\n###############################################################################\n\n\n - driver_schema = \n###############################################################################\n" + driver_schema+"\n###############################################################################\n");


				// driver folder creation
				fs.mkdir(driver_folder, function() {

					// driver file creation
					fs.writeFile(driver_file_name, driver_code, function(err) {

						if(err) {

							rpc_result = 'Error writing '+ driver_file_name +' file: ' + err;
							logger.error('[DRIVER] - '+driver_name+' --> ' + rpc_result);

							d.resolve(rpc_result);

						} else {


							// driver schema file creation
							fs.writeFile(driver_schema_name, driver_schema, function(err) {

								if(err) {

									rpc_result = 'Error writing '+ driver_schema +' file: ' + err;
									logger.error('[DRIVER] - '+driver_name+' --> ' + rpc_result);

									d.resolve(rpc_result);

								} else {

									manageDriversConf("update", driver_name, autostart, "injected", null, null, function(mng_result){

										logger.debug("[DRIVER] - "+driver_name+" --> " + mng_result.message);

										rpc_result = "Driver " + driver_name + " successfully injected!";
										logger.info("[DRIVER] --> " + rpc_result);

										d.resolve(rpc_result);


									});


								}

							});

						}

					});

				});



			}else{
				logger.error("[DRIVER] --> " + clean_res.message);
				d.resolve(clean_res.message);
			}

		}

	);

    return d.promise;

};


// RPC to totally remove a driver from the board
exports.removeDriver = function(args){
  
    // Parsing the input arguments
    var driver_name = String(args[0]);

    logger.info("[DRIVER] - REMOVE DRIVER RPC called for " + driver_name + "...");
    
    var d = Q.defer();

	cleanDriverData(driver_name).then(

		function (clean_res) {

			if (clean_res.result == "SUCCESS"){
				clean_res.message = "Driver '" + driver_name + "' successfully removed!";
				logger.info("[PLUGIN] --> " + clean_res.message);
				d.resolve(clean_res.message);
			}else{
				logger.error("[PLUGIN] --> " + clean_res.message);
				d.resolve(clean_res.message);
			}

		}

	);
    
    return d.promise;
    
};




// Function to clean all plugin data (folder and configuration)
function cleanDriverData(driver_name){

	var response = {
		message: '',
		result: ''
	};

	var d = Q.defer();

	var driver_folder = DRIVERS_STORE + driver_name;
	var mp_driver_folder = MP_DRIVERS + driver_name;

	if ( fs.existsSync(driver_folder) === true ){

		deleteFolderRecursive(driver_folder);		//delete driver files folder
		deleteFolderRecursive(mp_driver_folder);	//delete driver mountpoint folder

		logger.debug("[DRIVER] - " + driver_name + " --> driver folders deleted.");

	}
	else{
		logger.debug("[DRIVER] - " + driver_name + " --> driver folder already deleted.");
	}

	manageDriversConf("remove", driver_name, null, null, null, null, function(mng_result) {

		if(mng_result.result == "SUCCESS"){

			response.result = mng_result.result;
			response.message = "Driver successfully removed!";
			d.resolve(response);

		}else{
			d.resolve(mng_result);
		}


	});

	return d.promise;

}

// Function used to update/manage the status of the driver injected in the board
function manageDriversConf(operation, driver_name, autostart, status, remote, mirror_board, callback){

	try{

		var driversConf = JSON.parse(fs.readFileSync(DRIVERS_SETTING, 'utf8'));

		var mng_result = {};

		switch(operation){

			case 'update':

				logger.debug("[DRIVER] - "+driver_name+" --> Updating drivers.json...");
				logger.debug("[DRIVER] - "+driver_name+" --> Parameters specified:\n - status: "+status+"\n - remote: "+remote+ "\n - mirror_board: "+mirror_board+"\n - autostart: "+autostart);

				//Update the data structure
				if(status === "injected"){
					driversConf.drivers[driver_name] = {};
					driversConf.drivers[driver_name]['status'] = status;
					driversConf.drivers[driver_name]['remote'] = remote;
					driversConf.drivers[driver_name]['autostart'] = autostart;
					driversConf.drivers[driver_name]['mirror_board'] = mirror_board;

				}else if(status === "unmounted"){

					driversConf.drivers[driver_name]['status'] = status;

				}else{
					//status === "mounted"
					driversConf.drivers[driver_name]['status'] = status;
					driversConf.drivers[driver_name]['remote'] = remote;
					driversConf.drivers[driver_name]['mirror_board'] = mirror_board;
				}

				try{
					//Updates the JSON file
					fs.writeFile(DRIVERS_SETTING, JSON.stringify(driversConf, null, 4), function(err) {
						if(err) {
							mng_result.message = 'Error writing drivers.json file: ' + err;
							mng_result.result = "ERROR";
							callback(mng_result);

						} else {
							mng_result.message = "drivers.json updated";
							mng_result.result = "SUCCESS";
							callback(mng_result)

						}
					});

				}
				catch(err){
					logger.error('[DRIVER] - '+driver_name+' --> Error writing drivers.json filein manageDriversConf: '+err);
				}

				break;

			case 'remove':

				logger.debug("[DRIVER] - "+driver_name+" --> removing driver data from drivers.json...");

				if(driversConf["drivers"].hasOwnProperty(driver_name)){

					try{
						driversConf.drivers[driver_name]=null;
						delete driversConf.drivers[driver_name];

						fs.writeFile(DRIVERS_SETTING, JSON.stringify(driversConf, null, 4), function(err) {
							if(err) {
								mng_result.message = "drivers.json file updating failed: "+err;
								mng_result.result = "ERROR";
								logger.error("[DRIVER] - "+driver_name+" ----> " + mng_result.message );
								callback(mng_result);

							} else {
								mng_result.message = "driver data removed!";
								mng_result.result = "SUCCESS";
								logger.debug("[DRIVER] - "+driver_name+" ----> " + mng_result.message );
								callback(mng_result);

							}
						});

					}
					catch(err){
						mng_result.message = "Error parsing drivers.json: "+ err;
						mng_result.result = "ERROR";
						logger.warn("[DRIVER] - "+driver_name+" ----> "+ mng_result.message);
						callback(mng_result);
					}


				}else {
					mng_result.message = "driver data already removed";
					mng_result.result = "SUCCESS";
					logger.debug("[DRIVER] - "+driver_name+" ----> "+ mng_result.message);
					callback(mng_result);
				}

				break;

			default:
				//DEBUG MESSAGE
				mng_result.message = 'Operation "' + operation + '" not supported! - Supported operations are: "update", "remove".';
				mng_result.result = "ERROR";
				logger.warn("[DRIVER] - "+driver_name+" --> "+ mng_result.message);
				callback(mng_result);
				break;


		}

	}
	catch(err){
		logger.error('[DRIVER] - '+driver_name+' --> Error parsing drivers.json file in manageDriversConf: '+err);
	}



}

// Function used to delete all driver files during driver removing from the board
function deleteFolderRecursive(path){

	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			var curPath = path + "/" + file;
			if(fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteFolderRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}

}

// Function to un-register from WAMP server the RPCs of each file of the driver during unmounting
function UnRegister(driver_name, file_node, restarting, rest_response, d, callback){

	var driver_mp_node = mp_list[driver_name];

	// If this data structure is not null means that the driver to unmount was mounted in this session and we need to unregister each RPC function related to each driver file
	if (driver_mp_node != null){

		logger.debug("[DRIVER] - "+driver_name+" --> Data structures to clean...");

		// Unregistering RPCs for each file
		file_node.forEach(function(file, idx, list) {

			logger.debug("[DRIVER] - "+driver_name+" --> Unregistering ("+file.name+") read_function: " + JSON.stringify(driver_mp_node['/'+file.name].read_function));

			if ( driver_mp_node['/'+file.name] != undefined) {

				logger.debug("[DRIVER] - "+driver_name+" --> WAMP DRIVER STATUS: restarting = "+restarting + " - reconnected = " + reconnected);

				if ( restarting === "undefined" && reconnected === false ){

					//Unregistering read RPC functions
					session_drivers.unregister(driver_mp_node['/'+file.name].reg_read_function).then(

						function () {
							// successfully unregistered
							logger.debug("[DRIVER] - "+driver_name+" --> RPC read function of "+file.name +" unregistered!");

						},
						function (error) {
							// unregister failed
							logger.error("[DRIVER] - "+driver_name+" --> Error unregistering RPC read function of "+file);
						}

					);


					//Unregistering write RPC functions
					session_drivers.unregister(driver_mp_node['/'+file.name].reg_write_function).then(

						function () {
							// successfully unregistered
							logger.debug("[DRIVER] - "+driver_name+" --> RPC write function of "+file.name +" unregistered!");

						},
						function (error) {
							// unregister failed
							logger.error("[DRIVER] - "+driver_name+" --> Error unregistering RPC write function of "+file);
						}

					);


				}else{
					logger.debug("[DRIVER] - No need to unregister any WAMP RPC!");

				}


			}
			else{
				logger.debug("[DRIVER] - "+driver_name+" --> I have not unregistered RPC file ("+file.name+") functions!");
			}

			// If it is the last file analyzed we have to clean the driver garbage
			if (idx === list.length - 1){

				//DATA cleaning-----------------------------------------------------------------------------------------

				try{

					logger.debug("[DRIVER] - "+driver_name+" --> Cleaning driver garbage...");

					file_list[driver_name]=null;
					delete file_list[driver_name];
					logger.debug("[DRIVER] - "+driver_name+" --> Files removed from list!" );

					mp_list[driver_name]=null;
					delete mp_list[driver_name];
					logger.debug("[DRIVER] - "+driver_name+" --> Mountpoints removed!");

					callback({result:"SUCCESS", message:"RPCs unregistered"})

				}
				catch(err){
					logger.error("[DRIVER] - "+driver_name+" --> Data cleaning error during unmounting: "+err);
				}

				//------------------------------------------------------------------------------------------------------

			}

		});

	}
	else{
		logger.debug("[DRIVER] - "+driver_name+" --> No data structures to clean...");
		callback({result:"SUCCESS", message:"RPCs unregistered"});
	}



}

// Function used to manage the promise of the RPC function registration for each file enabled to be read remotely.
function ManageReadFileRegistration(registration, driver_name, file, driver_mp_node, idx, list){

	driver_mp_node['/'+file.name].reg_read_function = registration;

	logger.debug('[WAMP] - '+driver_name+' --> ' + file.name + ' read function registered!');

	if (idx === list.length - 1){

		mp_list[driver_name] = driver_mp_node;

		logger.info("[DRIVER] - "+driver_name+" --> RPC read functions successfully registered!");

	}

}

// Function used to manage the promise of the RPC function registration for each file enabled to be written remotely.
function ManageWriteFileRegistration(registration, driver_name, file, driver_mp_node, idx, list){

	driver_mp_node['/'+file.name].reg_write_function = registration;

	logger.debug('[WAMP] - '+driver_name+' --> ' + file.name + ' write function registered!');

	if (idx === list.length - 1){

		mp_list[driver_name] = driver_mp_node;

		logger.info("[DRIVER] - "+driver_name+" --> RPC write functions successfully registered!");

	}

}

// Function used to register WAMP write/read functions for each enabled file
function RegisterFiles(driver_name, file, driver_mp_node, idx, list){


	if(file.read_function != undefined){

		session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.read', exports.readRemote ).then(

			function(registration){
				ManageReadFileRegistration(registration, driver_name, file, driver_mp_node, idx, list);
			}
		);

	}else{

		session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.read', exports.NotAllowedRemoteFunction ).then(

			function(registration){
				ManageReadFileRegistration(registration, driver_name, file, driver_mp_node, idx, list);
			}
		);
	}

	if(file.write_function != undefined){

		session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.write', exports.writeRemote ).then(

			function(registration){
				ManageWriteFileRegistration(registration, driver_name, file, driver_mp_node, idx, list);
			}

		);


	}else{

		session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.write', exports.NotAllowedRemoteFunction ).then(

			function(registration){
				ManageWriteFileRegistration(registration, driver_name, file, driver_mp_node, idx, list);
			}

		);
	}



}

// Function used to mount via FUSE the driver and register the RPC functions for each file;
// if the driver mounting happens after a connection recovery we will only register again the RPC functions without re-mounting the driver via FUSE;
function LoadDriver(driver_name, mountpoint, remote, mirror_board){

	var driver_path = DRIVERS_STORE+driver_name;
	var driver_conf = driver_path+"/"+driver_name+".json";
	var driver_module = driver_path+"/"+driver_name+".js";

	var rest_response = {};

	var d = Q.defer();

	try{

		var driver = require(driver_module);

		var driverJSON = JSON.parse(fs.readFileSync(driver_conf, 'utf8'));

		logger.debug('[DRIVER] - '+driver_name+' --> JSON file '+ driver_name +'.json successfully parsed!');

		driver_name = driverJSON.name;

		var type = driverJSON.type; //logger.info("\tfile type: " + type)
		var permissions = MaskConversion(driverJSON.permissions); //logger.info("\tpermissions: " + MaskConversion(permissions))
		//var root_permissions = MaskConversion(driverJSON.root_permissions);
		var children = driverJSON.children; //logger.info("Files in the folder:")

		logger.debug("[DRIVER] - "+driver_name+" --> driver configuration loaded!");

		mp_list[driver_name]={};
		driver_mp_node = mp_list[driver_name];

		fuse_root_path='/';

		var root_mp = {
			mtime: new Date(),
			atime: new Date(),
			ctime: new Date(),
			size: 100,
			mode: permissions,
			uid: process.getuid(),
			gid: process.getgid()
		};

		driver_mp_node[fuse_root_path]={
			name: driver_name,
			mp: {},
			remote: remote,
			mirror_board: mirror_board
		};

		driver_mp_node[fuse_root_path].mp=root_mp;
		driver_mp_node[fuse_root_path].type = "folder";


		file_list[driver_name]=[];

		children.forEach(function(file, idx, list) {

			setTimeout(function() {

				logger.debug("[DRIVER] - "+driver_name+" --> analyzing file: "+file.name);

				file_list[driver_name].push(file.name);

				//fuse_file_path='/'+driver_name+'/'+file.name;
				fuse_file_path='/'+file.name;

				driver_mp_node[fuse_file_path]={
					name:"",
					read_function: null,
					write_function: null,
					mp: {},
					reg_read_function: null,
					reg_write_function: null
				};

				if(file.read_function != undefined){
					var read_function = file.read_function;
				}else{
					var read_function = null;
				}

				if(file.write_function != undefined){
					var write_function = file.write_function;
				}else{
					var write_function = null;
				}

				var file_mp = {
					mtime: new Date(),
					atime: new Date(),
					ctime: new Date(),
					size: 100,
					mode: MaskConversion(file.permissions),
					uid: process.getuid(),
					gid: process.getgid()
				};

				driver_mp_node[fuse_file_path].mp = file_mp;
				driver_mp_node[fuse_file_path].name = file.name;
				driver_mp_node[fuse_file_path].type = "file";
				driver_mp_node[fuse_file_path].read_function = read_function;
				driver_mp_node[fuse_file_path].write_function = write_function;

				RegisterFiles(driver_name, file, driver_mp_node, idx, list);

				if (idx === list.length - 1){

					logger.info("[DRIVER] - "+driver_name+" --> Available files: %s", JSON.stringify(file_list[driver_name]));

				}

			}, 100);  // end of setTimeout function

		});



		if ( reconnected === false ){

			logger.debug("[DRIVER] - "+driver_name+" --> It is necessary to mount the driver (reconnected = " + reconnected + ")");

			try{

				drivers[driver_name] = driver;

				var driverlib = drivers[driver_name];

				driverlib['init']( function(init_response){

					if(init_response.result == "SUCCESS"){

						logger.info("[DRIVER] - "+driver_name+" --> " + init_response.message);

						fuse.mount(mountpoint, {
							readdir: readdirFunction(driver_name),
							getattr: getattrFunction(driver_name),
							open: openFunction(driver_name),
							read: readFunction(driver_name, mirror_board), //read: readFunction(driver_name, filename, mirror_board),
							write: writeFunction(driver, driver_name)
						});

						rest_response.message = "Driver '"+driver_name+"' successfully mounted!";
						rest_response.result = "SUCCESS";

						d.resolve(rest_response);

					}
					else{

						logger.warn("[DRIVER] - "+driver_name+" --> " + init_response.message);

						rest_response.message = "ERROR during "+driver_name+" initialization -> " +init_response.message;
						rest_response.result = "ERROR";

						d.resolve(rest_response);

					}

				});

			}
			catch(err){

				rest_response.message = "ERROR during "+driver_name+" (fuse) mounting: " +err;
				rest_response.result = "ERROR";

				logger.warn("[DRIVER] - "+driver_name+" --> " + rest_response.message);

				d.resolve(rest_response);

			}


		}else{

			logger.debug("[DRIVER] - "+driver_name+" --> It is not necessary to mount the driver (reconnected = " + reconnected + ")");

			if(reconnected === true) reconnected = false;

			rest_response.message = "No need to mount driver after reconnection!";
			rest_response.result = "SUCCESS";

			d.resolve(rest_response);

		}



	}
	catch(err){
		rest_response.message = err;
		rest_response.result = "ERROR";
		d.resolve(rest_response);
	}

	return d.promise;

}

// Function that creates the directory and then mounts the driver.
function MountpointCreation(driver_name, mountpoint, remote, mirror_board, d){


	fs.mkdir(mountpoint, "0755", function() {

		logger.debug("[DRIVER] - "+driver_name+" ----> folder "+mountpoint+" CREATED!");

		AttachMountpoint(driver_name, mountpoint, remote, mirror_board, d);


	});

}

// Function that calls the LoadDriver function that will mount the driver
function AttachMountpoint(driver_name, mountpoint, remote, mirror_board, d) {

	LoadDriver(driver_name, mountpoint, remote, mirror_board).then(

		function(result){

			manageDriversConf("update", driver_name, null, "mounted", remote, mirror_board, function(mng_result){

				logger.debug("[DRIVER] - "+driver_name+" --> " + mng_result.message);

				d.resolve(result);

				logger.info("[DRIVER] - "+driver_name+" --> "+ result.message);

			});

		},
		function (error) {

			logger.warn("[DRIVER] - "+driver_name+" --> Error in LoadDriver function: "+ JSON.stringify(error));
			d.resolve(error);
		}
	);

}

// Wrapper for Fuse write-file function.
function writeFunction(driver, driver_name){

	return function (mountpoint, fd, buffer, length, position, cb) {

		logger.debug('[DRIVER] - '+driver_name+' --> Writing ', buffer.slice(0, length));
		content = buffer.slice(0, length);
		logger.debug('[DRIVER] - '+driver_name+' --> buffer content: ' + content.toString());
		logger.debug('[DRIVER] - '+driver_name+' --> buffer length: ' + length.toString());

		driver_mp_node = mp_list[driver_name];

		if (driver_mp_node[mountpoint].write_function === null){

			cb(fuse.EACCES);

		} else {
			driver[driver_mp_node[mountpoint].write_function ]( content, function(){
				cb(length);
			});
		}

	};



}

// Wrapper for Fuse read-directory function
function readdirFunction(driver_name){

	return function (mountpoint, cb) {

		logger.debug("[DRIVER] - "+driver_name+" --> readdir(%s) - files list: %s", mountpoint, JSON.stringify(file_list[driver_name]) );

		//if (mountpoint === '/') return cb(0, [driver_name]);
		//if (mountpoint === '/'+driver_name) return cb(0, file_list[driver_name] );
		if (mountpoint === '/') return cb(0, file_list[driver_name] );

		cb(0);

	};

}

// Wrapper for Fuse get-attr function
function getattrFunction(driver_name){

	return function (mountpoint, cb) {

		logger.debug("[DRIVER] - "+driver_name+" --> getattr(%s)", mountpoint);

		driver_mp_node = mp_list[driver_name];

		if(driver_mp_node[mountpoint].mp != undefined){
			cb(0, driver_mp_node[mountpoint].mp );
			return
		}

		cb(fuse.ENOENT);

	}

}

// Wrapper for Fuse open-file function
function openFunction(driver_name){

	return function (mountpoint, flags, cb) {

		fd_index = fd_index + 1;

		logger.debug("[DRIVER] - "+driver_name+" --> Open(%s, %d) - fd = %s", mountpoint, flags, fd_index);

		cb(0, fd_index); //cb(0, 42) // 42 is an fd
	}

}

// Wrapper for Fuse read-file function
function readFunction(driver_name, mirror_board){

	return function (mountpoint, fd, buf, len, pos, cb) {

		driver_mp_node = mp_list[driver_name];

		var driver = drivers[driver_name];

		// To read a file of a driver mounted locally that return as result the value of a local endpoint (a sensor, etc.)
		if (driver_mp_node['/'].remote === "false"){

			logger.debug("[DRIVER] - "+driver_name+" --> Read(%s, %d, %d, %d)", mountpoint, fd, len, pos);

			driver[driver_mp_node[mountpoint].read_function]( function(read_content){
				var buffer = new Buffer(read_content.toString(), 'utf-8');
				var str = ''+buffer.slice(pos);
				if (!str)
					return cb(0);
				buf.write(str);

				return cb(str.length);
			});


		}else{

			// To read a file of a driver mounted locally that return as result the value of a remote endpoint (i.e. a sensor on a remote board, etc.)
			// A mirrored board is a board that share its hardware that can be used by a board that mount remotely the same driver.
			var filename = mountpoint.replace('/','');

			logger.debug('[DRIVER] - '+driver_name+' - REMOTE CALLING to '+mirror_board + ' RPC called: s4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.read');

			// Call the RPC read function of the board that shares the hardware
			session_drivers.call('s4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.read', [driver_name, filename]).then(

				function(read_content){

					var buffer = new Buffer(read_content.toString(), 'utf-8');
					var str = ''+buffer.slice(pos);

					if (!str)
						return cb(0);

					buf.write(str);

					return cb(str.length);

				}
			);

		}


	}



}

// Function used to convert file permission rappresentation from base 10 to 8
function MaskConversion(mode_b10){
	//var mode_b10 = 100644//40755
	mode_b8 = parseInt(mode_b10.toString(10), 8);
	//logger.info("from b10 "+mode_b10+" to b8 "+mode_b8)
	permission = mode_b8;
	return permission
}

/*
function HumanMaskConversion(mode_b10){
	 mode_b8 = parseInt(mode_b10.toString(10), 8)
	 //logger.info("from b10 "+mode_b10+" to b8 "+mode_b8)
	 permission = mode_b8
	 return permission
}
*/



//This function exports all the functions in the module as WAMP remote procedure calls
exports.Init = function (session){
    
    session_drivers = session;
     
    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+boardCode+'.driver.mountDriver', exports.mountDriver);
    session.register('s4t.'+boardCode+'.driver.unmountDriver', exports.unmountDriver); 
    session.register('s4t.'+boardCode+'.driver.injectDriver', exports.injectDriver);
    session.register('s4t.'+boardCode+'.driver.removeDriver', exports.removeDriver);
    
    logger.info('[WAMP-EXPORTS] Driver commands exported to the cloud!');

    
};


//This function executes procedures at boot time (no Iotronic dependent)
exports.Boot = function (){

	logger.info('[BOOT] - Driver Manager booting procedures not defined.');

};