/*
*				                  Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/

//service logging configuration: "managePlugins"
var log4js = require('log4js');
var logger = log4js.getLogger('managePlugins');

var fs = require("fs");
var Q = require("q");
var cp = require('child_process');  	//In order to create a plugin-wrapper process for each active plugin.
var running = require('is-running');  	//In order to verify if a plugin is alive or not.


var plugins = {};	// This data structure collects all status information of all plugins started in this LR session
var PLUGINS_SETTING = './plugins/plugins.json';
var PLUGINS_STORE = './plugins/';
    
    


// This function executes a syncronous plugin ("call" as the exection of a command that returns a value to the "caller"): it is called by Iotronic via RPC
exports.call = function (args, details){
    
	//Parsing the input arguments
	var plugin_name = String(args[0]);
	var plugin_json = String(args[1]);
    
    var d = Q.defer();
        
    // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
    var plugin_autostart = "";
    
    logger.info('[PLUGIN] - Execution request for \"'+ plugin_name +'\" plugin with parameter json: '+plugin_json);
    
    try{
        //Reading the plugins.json configuration file
        var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
    }
    catch(err){
        logger.error('[PLUGIN] --> Error parsing JSON file plugins.json');
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){

		logger.info("[PLUGIN] --> Plugin successfully loaded!");
        
        //Check the plugin status
		var status = pluginsConf.plugins[plugin_name].status;
	
        if (status == "off" || status == "injected"){
            
            logger.info("[PLUGIN] --> Plugin " + plugin_name + " being started");
            
            //Create a new process that has plugin-wrapper as code
            var child = cp.fork('./modules/plugins-manager/call-wrapper');

            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            };
	      
            
            child.on('message', function(msg) {
	   
	      		if(msg.name != undefined){

					if (msg.status === "alive"){
		  
						//Creating the plugin json schema
						var plugin_folder = PLUGINS_STORE + plugin_name;
						var schema_outputFilename = plugin_folder + "/" + plugin_name + '.json';

						fs.writeFile(schema_outputFilename, plugin_json, function(err) {
			
							if(err) {

								logger.error('[PLUGIN] --> Error parsing '+plugin_name+'.json file: ' + err);

							} else {

								logger.info('[PLUGIN] --> Plugin JSON schema saved to ' + schema_outputFilename);

								// - change the plugin status from "off" to "on" and update the PID value
								pluginsConf.plugins[plugin_name].status = "on";
								pluginsConf.plugins[plugin_name].pid = child.pid;

								fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {

									if(err) {
										logger.error('[PLUGIN] --> Error writing plugins.json file: ' + err);
									} else {
										logger.info("[PLUGIN] --> JSON file plugins.json updated -> " + plugin_name + ':  status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
									}

								});

							}

		      			});
		      
		  
		  
					} else if(msg.status === "finish") {
		  
		  				logger.info("[PLUGIN] --> RESULT: ", msg.logmsg);
		  				d.resolve(msg.logmsg);
		  
					} else if(msg.status === "fault") {
		  
		  				logger.info("[PLUGIN] --> RESULT: ", msg.logmsg);
		  				d.resolve(msg.logmsg);
		  
					} else if(msg.level === "error") {
		  
		  				logger.error("[PLUGIN] --> "+ msg.name + ": " + msg.logmsg);
		  
					} else if(msg.level === "warn") {
		  
		  				logger.warn("[PLUGIN] --> "+ msg.name + ": " + msg.logmsg);
		  
					}
					else{
		  				logger.info("[PLUGIN] --> "+ msg.name + ": " + msg.logmsg);

					}
		
	      		}
	      		else{
					//serve per gestire il primo messaggio alla creazione del child
					logger.info("[PLUGIN] --> " + msg);
	      		}

	      
	    	});
 
	    
	    	//I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
	    	child.send(input_message);
	    
	    	return d.promise;

        }
        else{
            logger.warn("[PLUGIN] --> Call already started!");
            return 'Call already started on this board!';
        }
        
    }
    else{
      // Here the plugin does not exist
      logger.warn("[PLUGIN] --> Call \"" + plugin_name + "\" does not exist on this board!");
      return 'Call does not exist on this board!';
    }

};

// This function checks if the plugin process is still alive otherwise starts it
function pluginStarter(plugin_name, timer, plugin_json_name, skip) {

	try{
	
		// Get the plugin's configuration.
	  	var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
	  
	  	var status = pluginsConf.plugins[plugin_name].status;
	  	var pid = pluginsConf.plugins[plugin_name].pid;
	  	var autostart = pluginsConf.plugins[plugin_name].autostart;
    
	  	// The board restarts all the plugins with status "on" (this status happens after a crash of L-R/board) or with autostart parameter set at true (because some plugins need to start at boot time).
	  	if (status == "on" || autostart == "true"){

			// if the pid of plugin is empty (wrong status)
			if (pid == '') {

				plugins[plugin_name]={
					child: "",
					pid: pid,
					alive: false,
					timer: timer
				}
		
			}else if( pid == null){
		  
		    	// if the plugin was just injected it does not have the "pid" field in the plugins.json conf file
		    	skip = "true";
		    
				plugins[plugin_name]={
					child: "",
					pid: pid,
					alive: null,
					timer: timer
				}
		    
			}else{
		  
				// if the pid is specified and the device is in the after reboot status of the device/LR or after a crash of the plugin process
				plugins[plugin_name]={
					child: "",
					pid: pid,
					alive: running(pid),
					timer: timer
				}
		  
			}

			if( plugins[plugin_name].alive === true ){
				// the plugin is normally running
				logger.debug('[PLUGIN] - PluginChecker - '+ plugin_name + ' with PID: ' + plugins[plugin_name].pid + ' alive: '+ plugins[plugin_name].alive );

			}
			else if( skip === "true") {

				// the plugin is in injected state and it doesn't need to be restarted
				logger.info("[PLUGIN] - " + plugin_name + ' is a new plugin! status: injected - It is needed to start it the first time!' );
				clearPluginTimer(plugin_name);

			}
			else if( plugins[plugin_name].alive === false || skip === "false") {

				// the plugin is not alive: we are in the state after a reboot of the device/LR or after a crash of the plugin process
				logger.warn( '[PLUGIN] - PluginChecker - '+ plugin_name + ' - No such process found with PID '+plugins[plugin_name].pid+'!'+ ' - alive: '+ plugins[plugin_name].alive +' - Restarting...');

				// If the schema json file exists the board will create a child_process to restart the plugin and update the status and the PID value
				if (fs.existsSync(plugin_json_name) === true){

					//Create a new process that has plugin-wrapper as code
					try{

						plugins[plugin_name].child = cp.fork('./modules/plugins-manager/plugin-wrapper');

						var plugin_json_schema = JSON.parse(fs.readFileSync(plugin_json_name));
						var input_message = {
							"plugin_name": plugin_name,
							"plugin_json": plugin_json_schema
						};

						logger.info("[PLUGIN] --> "+ plugin_name + " - Input parameters: "+ fs.readFileSync(plugin_json_name));

						pluginsConf.plugins[plugin_name].pid = plugins[plugin_name].child.pid;
						pluginsConf.plugins[plugin_name].status = "on";


						plugins[plugin_name].child.send(input_message);


						plugins[plugin_name].child.on('message', function(msg) {

							if(msg.name != undefined){

								if (msg.status === "alive"){

									//updates the JSON file plugins.json
									try{

										fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {
											if(err) {
												logger.error('[PLUGIN] --> '+ plugin_name + ' - Error writing JSON file ' + PLUGINS_SETTING + ': ' + err);
											} else {
												logger.debug("[PLUGIN] --> "+ plugin_name + " - JSON file " + PLUGINS_SETTING + " updated!");
											}
										});

									}
									catch(err){
										logger.error('[PLUGIN] --> '+ plugin_name + ' - Error updating JSON file ' + PLUGINS_SETTING + ': ' + err);
									}

									logger.info("[PLUGIN] --> "+ msg.name + " - " + msg.status + " - Plugin initialization completed: PID = " + pluginsConf.plugins[plugin_name].pid +" - Status = " + pluginsConf.plugins[plugin_name].status);


								} else if(msg.level === "error") {

									logger.error("[PLUGIN] - "+ msg.name + " - " + msg.logmsg);

								} else if(msg.level === "warn") {

									logger.warn("[PLUGIN] --> "+ msg.name + " - " + msg.logmsg);

								} else{

									logger.info("[PLUGIN] --> "+ msg.name + " - " + msg.logmsg);

								}


							} else{
								//used to manage the first message coming from the child process
								logger.info("[PLUGIN] --> "+ msg);
							}

						});

					}
					catch(err){
						logger.error('[PLUGIN] --> Error starting '+plugin_name+' plugin: ' + err);
					}


				}else{

					//If the schema json file doesn't exist the related plugin will be not restarted and the value of its PID will be cleaned.

					//updates the plugins.json JSON file
					try{

						logger.warn('[PLUGIN] --> '+ plugin_name + ' - I can not restart plugin!!! JSON file '+ plugin_json_name +' does not exist!');

						pluginsConf.plugins[plugin_name].pid = "";

						fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {
							if(err) {
								logger.error('[PLUGIN] --> '+ plugin_name + ' - Error writing JSON file ' + PLUGINS_SETTING + ': ' + err);
							} else {
								logger.info('[PLUGIN] --> '+ plugin_name + ' - JSON file ' + PLUGINS_SETTING + ' updated: PID value cleaned!');
							}
						});

						logger.warn('[PLUGIN] --> '+ plugin_name + ' - Please call the RUN command again for this plugin!');

					}
					catch(err){
						logger.error('[PLUGIN] --> '+ plugin_name + ' - Error updating JSON file ' + PLUGINS_SETTING + ': ' + err);
					}

				}

			}
		
		}

	  
      }
      catch(err){
	  	logger.error('[PLUGIN] --> '+ plugin_name + ' - Error loading plugin: ' + err);
      }

    
}

// This function delete the timer associated with a plugin
function clearPluginTimer(plugin_name) {
  
    try{
      
		if( plugins[plugin_name].timer == null){

	  		logger.debug("[PLUGIN] --> " +plugin_name+ ": no timer to clear!");

		}else{
	  		clearInterval( plugins[plugin_name].timer );
  			logger.debug("[PLUGIN] --> " + plugin_name +": timer cleared!");
		}
	  
    }  
    catch(err){
		logger.error('[PLUGIN] --> Error in clearing timer for plugin '+plugin_name+': '+ err);
    }
    
}

// This function checks if the plugin has to be restarted
exports.pluginKeepAlive = function (plugin_name){
   
    try{
	  
		// Get the plugin's configuration.
		var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
		var status = pluginsConf.plugins[plugin_name].status;
		var autostart = pluginsConf.plugins[plugin_name].autostart;

		var plugin_folder = PLUGINS_STORE + plugin_name;
		var plugin_json_name = plugin_folder + "/" + plugin_name + '.json';

		var skip = "false";

		// We have to restart only the plugins:
		// - that the "autostart" flag is TRUE (boot enabled plugin)
		// - that were in status "on" (it means that the device it was rebooted or LR crashed) even if "auotstart" is FALSE
	  	if (status == "on" || autostart == "true"){

			// We associate to each plugin that has to be restarted (no injected ones) a timer to check during LR execution if the plugin is still alive
			if(status != "injected"){

				/*
					We have to verify this "injected" status condition because of when a plugin is just injected, with "autostart" set at true, has the following configuration:
						"PLUGIN": {
							"status": "injected",
							"autostart": "true"
						}

				*/

				// BUT we call NOW "pluginStarter" in order to start immediately the plugins that have to be, with "timer" parameter set to null,
				// so in this way we don't wait for the timer expiration 
				pluginStarter(plugin_name, null, plugin_json_name, skip);
		
		  		var timer = setInterval(function() {
		    
		      		pluginStarter(plugin_name, timer, plugin_json_name, skip);

		  		}, 300000);

		  		plugins[plugin_name]={
					child: "",
					pid: "",
					alive: "",
					timer: timer
			  	}
		  
	      	}
	      
	  	}

	  
    }
    catch(err){
		logger.error('Error in keeping alive the plugin '+plugin_name+': '+ err);
    }


};


// This function is used to restart all enabled plugins at LR startup...moreover associates a timer with each plugin to check if the plugin process is alive
exports.pluginsLoader = function (){
  
    logger.info('[PLUGIN] - Plugins loader is running!');

    try{
      
		// Get the plugin's configuration.
	  	var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
	  
	  	// Get the plugin json object list
	  	var plugins_keys = Object.keys( pluginsConf["plugins"] );

	  	// Get the number of plugins in the list "plugins_keys" in order to use it in the next loop
	  	var plugin_num = plugins_keys.length;
	  	logger.debug('[PLUGIN] - Number of installed plugins: '+ plugin_num);

		if(plugin_num > 0) {

			logger.info('[PLUGIN] |- Restarting enabled plugins on the device: ');

			for (var i = 0; i < plugin_num; i++) {

				(function (i) {

					var plugin_name = plugins_keys[i];
					var status = pluginsConf.plugins[plugin_name].status;
					var autostart = pluginsConf.plugins[plugin_name].autostart;

					logger.info('[PLUGIN] |--> ' + plugin_name + ' - status: ' + status + ' - autostart: ' + autostart);

					setTimeout(function () {

						exports.pluginKeepAlive(plugin_name);

					}, 7000 * i);

				})(i);

			}
			
		}else{
			logger.info('[PLUGIN] - No enabled plugins to be restarted!');
		}

    }
    catch(err){
		logger.warn('[PLUGIN] - Error parsing plugins.json: '+ err);
    }

};


// This function puts in running an asynchronous plugin in a new process: it is called by Iotronic via RPC
exports.run = function (args){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    
    // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
    var plugin_autostart = "";

	var d = Q.defer();

	var response = {
		message: '',
		result: ''
	};
    
    logger.info('[PLUGIN] - Run plugin RPC called for plugin '+ plugin_name +' plugin...');
    logger.info("[PLUGIN] --> Input parameters: "+ plugin_json);
    
    try{
        //Reading the plugin configuration file
        var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
    }
    catch(err){
		response.result = "ERROR";
		response.message = 'Error parsing plugins.json!';
        logger.error('[PLUGIN] - '+plugin_name + ' plugin execution error: '+response.message);
		d.resolve(response);
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
		logger.debug('[PLUGIN] - '+ plugin_name + ' - Plugin configuration successfully loaded!');
        
        //Check the status
        var status = pluginsConf.plugins[plugin_name].status;
        
        if (status == "off" || status == "injected"){
            
            logger.info('[PLUGIN] - '+ plugin_name + ' - Plugin starting...');
            
            //Create a new process that has plugin-wrapper as code
            var child = cp.fork('./modules/plugins-manager/plugin-wrapper');
            
            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            };

            child.on('message', function(msg) {
	   
	      		if(msg.name != undefined){
		
					if (msg.status === "alive"){

		      			//Creating the plugin json schema
						var plugin_folder = PLUGINS_STORE + plugin_name;
						var schema_outputFilename = plugin_folder + "/" + plugin_name + '.json';

		      			fs.writeFile(schema_outputFilename, plugin_json, function(err) {
			
			  				if(err) {
								response.result = "ERROR";
								response.message = 'Error opening '+plugin_name+'.json file: ' + err;
								logger.error('[PLUGIN] - "'+plugin_name + '" - '+response.message);
								d.resolve(response);
			      
			  				} else {
			    
			      				logger.info('[PLUGIN] - '+ plugin_name + ' - Plugin JSON schema saved to ' + schema_outputFilename);
	      
			      				// Reading the plugins.json configuration file
			      				try{
				
				  					var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
				  					var pluginsSchemaConf = JSON.parse(fs.readFileSync(schema_outputFilename, 'utf8'));
				  
				  					//Get the autostart parameter from the schema just uploaded
				  					plugin_autostart = pluginsSchemaConf.autostart;
				  

			      				}
			      				catch(err){

									response.result = "ERROR";
									response.message = 'Error parsing plugins.json configuration file: ' + err;
									logger.error('[PLUGIN] - '+plugin_name + ' - '+response.message);

									d.resolve(response);

			      				}
			      
			      				// Updating the plugins.json file:
			      				// - check if the user changed the autostart parameter at this stage
			      				if(plugin_autostart != undefined){
				
				  					pluginsConf.plugins[plugin_name].autostart = plugin_autostart;
				  					logger.info('[PLUGIN] - '+ plugin_name + ' - Autostart parameter set by user to ' + plugin_autostart);

			      				} else {
				
				  					logger.info('[PLUGIN] - '+ plugin_name + ' - Autostart parameter not changed!');
				
			      				}
			      
			      				// - change the plugin status from "off" to "on" and update the PID value
			      				pluginsConf.plugins[plugin_name].status = "on";
			      				pluginsConf.plugins[plugin_name].pid = child.pid;
			      
			      				fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {
				
				  					if(err) {
				      					logger.error('[PLUGIN] - '+ plugin_name + ' - Error opening '+plugin_name+'.json file: ' + err);
				  					} else {
				      					logger.info('[PLUGIN] - '+ plugin_name + ' - plugins.json updated -> autostart < ' + pluginsConf.plugins[plugin_name].autostart + ' > - status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
				      
				      					// Start a timer to check every X minutes if the plugin is still alive!
				      					exports.pluginKeepAlive(plugin_name);
				      
				  					}
				  
			      				});
			      
			  				}

		      			});

		      
					} else if(msg.level === "error") {
		  
		  				logger.error("[PLUGIN] - "+ msg.name + " - " + msg.logmsg);
		  
					} else if(msg.level === "warn") {
		  
		  				logger.warn("[PLUGIN] - "+ msg.name + " - " + msg.logmsg);
		  
					} else{

		  				logger.info("[PLUGIN] - "+ msg.name + " - " + msg.logmsg);

					}
		
	      		} else{
					//serve per gestire il primo messaggio alla creazione del child
					logger.info("[PLUGIN] --> "+ msg);
	      		}

	      
	    	});

	    	//I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
	    	child.send(input_message);

			response.result = "SUCCESS";
			response.message = 'Plugin is running!';
			logger.info('[PLUGIN] - "'+plugin_name + '" - '+response.message);
			d.resolve(response);


        }
        else{

			response.result = "WARNING";
			response.message = 'Plugin already started on this board!';
			logger.warn('[PLUGIN] - '+plugin_name+' - '+response.message);
			d.resolve(response);

        }
        
    }
    else{
      	// Here the plugin does not exist

		response.result = "ERROR";
		response.message = "Plugin \"" + plugin_name + "\" does not exist on this board!";
		logger.warn('[PLUGIN] - '+plugin_name + ' - '+response.message);
		d.resolve(response);

    }

	return d.promise;

};


// This function stop/kill a running asynchronous plugin: it is called by Iotronic via RPC
exports.kill = function (args){
    
    var plugin_name = String(args[0]);
    
    logger.info('[PLUGIN] - Stop plugin RPC called for plugin '+ plugin_name +' plugin...');

	var d = Q.defer();

	var response = {
		message: '',
		result: ''
	};


	// Get the plugin's configuration.
    try{
      
	    var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
	
	    if( pluginsConf["plugins"].hasOwnProperty(plugin_name) ){
      
	  		var status = pluginsConf.plugins[plugin_name].status;

	      	if (status == "on"){
		  
		  		var pid = pluginsConf.plugins[plugin_name].pid;

				logger.info('[PLUGIN] --> '+ plugin_name + ' - Plugin (with PID='+pid+') being stopped!');
		  
		  		//PLUGIN KILLING
		  		process.kill(pid);
		  
		  		pluginsConf.plugins[plugin_name].status = "off";
		  		pluginsConf.plugins[plugin_name].pid = "";

		  		// updates the JSON file
		  		fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {
		    
		      		if(err) {

						response.result = "ERROR";
						response.message = 'Error writing plugins.json: '+ err;
						logger.error('[PLUGIN] - stop plugin '+plugin_name + ' error: '+response.message);
						d.resolve(response);

		      		} else {
			  			logger.debug("[PLUGIN] --> " + PLUGINS_SETTING + " updated!");
			  			clearPluginTimer(plugin_name);
		      		}

		  		});

				response.result = "SUCCESS";
				response.message = 'Plugin killed!';
				logger.info('[PLUGIN] - stop plugin '+plugin_name + ': '+response.message);
				d.resolve(response);
		  
	  		}
	      	else{
				response.result = "ERROR";
				response.message = 'Plugin is not running on this board!';
				logger.error('[PLUGIN] - stop plugin '+plugin_name + ': '+response.message);
				d.resolve(response);
	  		}
	      
  		}
    

    }
    catch(err){

		response.result = "ERROR";
		response.message = 'Error parsing JSON file plugins.json: '+ err;
		logger.error('[PLUGIN] - stop plugin "'+plugin_name + '" error: '+response.message);
		d.resolve(response);
    }

	return d.promise;
    
};


// This function manage the injection request of a plugin into the device: it is called by Iotronic via RPC
exports.injectPlugin = function(args){
    
    // Parsing the input arguments
    plugin_name = String(args[0]);
    plugin_code = String(args[1]);
    
    // The autostart parameter is used to set the boot execution configuration of the plugin.
    autostart = String(args[2]);
    
    logger.info("[PLUGIN] - Injecting plugin RPC called for "+plugin_name+" plugin...");
    logger.info("[PLUGIN] --> Parameters injected: { plugin_name : " + plugin_name + ", autostart : " + autostart + " }");
    logger.debug("[PLUGIN] --> plugin code:\n\n" + JSON.stringify(plugin_code) + "\n\n");

	var response = {
		message: '',
		result: ''
	};

	var d = Q.defer();

	var plugin_folder = PLUGINS_STORE + plugin_name;
	var fileName = plugin_folder + "/" + plugin_name + '.js';

	// Check plugin folder
	if ( fs.existsSync(plugin_folder) === false ){

		// plugin folder creation
		fs.mkdir(plugin_folder, function() {

			// Writing the file

			fs.writeFile(fileName, plugin_code, function(err) {

				if(err) {

					response.result = "ERROR";
					response.message = 'Error writing '+ fileName +' file: ' + err;
					logger.error('[PLUGIN] --> ' + response.message);
					d.resolve(response);

				} else {

					//Reading the plugins configuration file
					var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));

					//Update the data structure of the plugin
					pluginsConf.plugins[plugin_name] = {};
					pluginsConf.plugins[plugin_name]['status'] = "injected";

					if(autostart != undefined){
						pluginsConf.plugins[plugin_name]['autostart'] = autostart;
					} else {
						pluginsConf.plugins[plugin_name]['autostart'] = false;
					}

					//Update plugins.json config file
					fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {
						if(err) {

							response.result = "ERROR";
							response.message = 'Error writing plugins.json file: ' + err;
							logger.error('[PLUGIN] --> ' + response.message);
							d.resolve(response);

						} else {

							logger.debug("[PLUGIN] --> Plugins configuration file saved to " + PLUGINS_SETTING);
							response.result = "SUCCESS";
							response.message = "Plugin "+ plugin_name +" injected successfully!";
							logger.info('[PLUGIN] --> ' + response.message);
							d.resolve(response);

						}
					});

				}
			});

		});

	} else{

		response.result = "ERROR";
		response.message = "ERROR: "+plugin_name+" plugin's files already injected! - Remove the previous plugin installation!";
		logger.warn('[PLUGIN] --> ' + response.message);
		d.resolve(response);

	}


    
    return d.promise;
    
};



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

// This function manage the removal of a plugin from the device: it is called by Iotronic via RPC
exports.removePlugin = function(args){
    
    // Parsing the input arguments
    plugin_name = String(args[0]);
    
    logger.info("[PLUGIN] - Removing plugin RPC called for " + plugin_name +" plugin...");

	var plugin_folder = PLUGINS_STORE + plugin_name;
    var pluginFileName = plugin_folder + "/" + plugin_name + '.js';
    var pluginConfFileName = plugin_folder + "/" + plugin_name+'.json';
    
    var d = Q.defer();

	if ( fs.existsSync(plugin_folder) === true ){

		deleteFolderRecursive(plugin_folder);		//delete plugin files folder

		logger.debug('[PLUGIN] --> Plugin data cleaning...');

		//Reading the plugins configuration file
		var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));

		if(	pluginsConf["plugins"].hasOwnProperty(plugin_name)	){

			var pluginStatus = pluginsConf.plugins[plugin_name]['status'];

			pluginsConf.plugins[plugin_name]=null;
			delete pluginsConf.plugins[plugin_name];
			logger.debug("[PLUGIN] --> Plugin board successfully removed from plugins.json!" );

			fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {

				if(err) {
					response = "plugin.json file updating FAILED: "+err;
					logger.error("[PLUGIN] --> plugin.json updating FAILED: "+err);
					d.resolve(response);

				} else {

					logger.debug("[PLUGIN] --> plugins.json file updated!");
					response = plugin_name+" completely removed from board!";
					logger.info("[PLUGIN] --> " + plugin_name + " - plugin completely removed from board!");
					d.resolve(response);

				}

			});

		}else{
			logger.warn("[PLUGIN] --> plugins.json already clean!");
			response = plugin_name+" completely removed from board!";
			logger.info("[PLUGIN] --> " + plugin_name + " - plugin completely removed from board!");
			d.resolve(response);
		}

	}else{

		response = "Plugin "+pluginFileName+" not found!";
		logger.warn("[PLUGIN] --> Plugin "+pluginFileName+" not found!");
		d.resolve(response);

	}



	/*
    fs.exists(pluginFileName, function(exists) {
      
		if(exists) {
	
			logger.debug('[PLUGIN] --> File '+pluginFileName+' exists. Deleting now ...');

			fs.unlink(pluginFileName, function(err) {

				if(err) {
					response = "[PLUGIN] --> Plugin file removing FAILED: "+err;
					logger.error(response);
					d.resolve(response);
				}

			});
	
		} else {
			response = "Plugin "+pluginFileName+" not found!";
	  		logger.warn("[PLUGIN] --> Plugin "+pluginFileName+" not found!");
		}

  		logger.debug('[PLUGIN] --> Plugin data cleaning...');

		//Reading the plugins configuration file
		var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));

      	if(	pluginsConf["plugins"].hasOwnProperty(plugin_name)	){

			var pluginStatus = pluginsConf.plugins[plugin_name]['status'];
	
	  		pluginsConf.plugins[plugin_name]=null;
	  		delete pluginsConf.plugins[plugin_name];
	  		logger.debug("[PLUGIN] --> Plugin board successfully removed from plugins.json!" );
	  
	  		fs.writeFile(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4), function(err) {

	      		if(err) {
		  			response = "plugin.json file updating FAILED: "+err;
		  			logger.error("[PLUGIN] --> plugin.json updating FAILED: "+err);
		  			d.resolve(response);
		  
				} else {
		  			logger.debug("[PLUGIN] --> plugins.json file updated!");
		  
		  			fs.exists(pluginConfFileName, function(exists) {

						if(exists) {

							fs.unlink(pluginConfFileName, function (err) {
								if (err){
									response = pluginConfFileName+" file deleting FAILED: "+err;
									logger.warn("[PLUGIN] --> "+pluginConfFileName+" file deleting FAILED: "+err);
									d.resolve(response);
								}else{
									logger.debug("[PLUGIN] --> "+pluginConfFileName+" file successfully deleted!");
									response = plugin_name+" completely removed from board!";
									logger.info("[PLUGIN] --> " + plugin_name + " - plugin completely removed from board!");
									d.resolve(response);
								}
							});

						}else{
							logger.warn("[PLUGIN] --> "+pluginConfFileName+" file does not exist! - Plugin was in status: " + pluginStatus);
							response = plugin_name+" completely removed from board!";
							logger.info("[PLUGIN] --> " + plugin_name + " - plugin completely removed from board!");
							d.resolve(response);
						}
			
		  			});
		  
	      		}

	  		});

      	}else{
	  		logger.warn("[PLUGIN] --> plugins.json already clean!");
	  		response = plugin_name+" completely removed from board!";
	  		logger.info("[PLUGIN] --> " + plugin_name + " - plugin completely removed from board!");
	  		d.resolve(response);
      	}
		
      
      
    });
	*/

    return d.promise;
    
};







//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPluginCommands = function (session){
	
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.plugin.run', exports.run);
    session.register(boardCode+'.command.rpc.plugin.kill', exports.kill);    
    session.register(boardCode+'.command.rpc.injectplugin', exports.injectPlugin);
    session.register(boardCode+'.command.rpc.plugin.call', exports.call);
    session.register(boardCode+'.command.rpc.removeplugin', exports.removePlugin);
    
    logger.info('[WAMP-EXPORTS] Plugin commands exported to the cloud!');
    
};

