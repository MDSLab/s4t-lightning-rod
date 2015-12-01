//ADESSO NON FUNZIONA PERCHé LA CHIAMATA REST NON RITORNA CORRETTAMENTE
//Per adesso stiamo considerando processi asincroni che non restituiscono nulla
//Per far restituire qualcosa alla funzione run (almeno se il processo è stato lanciato correttamente) credo che si debbano usare le promise ma non sono sicuro (si dovrebbe domandare a quelli di TAVENDO se è possibile in WAMP dichiarare una RPC con una funziona asincrona ed eventualmente come).




//service logging configuration: "managePlugins"   
var logger = log4js.getLogger('managePlugins');


/*
exports.call_sync = function (args, kwargs, details){
  
    var when = require('when');
    var synco="rrr";

    test_sync(args, function(err, result){
	logger.info("LOG: "+result);
	synco = result;
    });

    var n = 1;

    var interval_id = null;

    if (details.progress) {
	var i = 0;
	details.progress([i]);
	i += 1;
	interval_id = setInterval(function () {
	  if (i < n) {
	      details.progress([i]);
	      i += 1;
	  } else {
	      clearInterval(interval_id);
	  }
	}, 1000);
    }

    logger.info("LOG: "+ n);
    var d = when.defer();

    setTimeout(function () {
	d.resolve(synco);
    }, 7000 * n);
    
    return d.promise;
    
    
}

function test_sync(args, callback){    
   somma_sync(args, function(err, result){
	  setTimeout(function(args) {   results="ciaooooooo"+result;     callback("OK", results);  }, 5000);
    });	    
	    
}  

function somma_sync(args, callback2){  
  var a=1; var b=2;
  var c=a+b;
  callback2("OK", c);
}
*/



//This function executes a single call
exports.call = function (args, details){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    
    
    
    
    var when = require('when');
    var d = when.defer();
    
    
    
    
    // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
    var plugin_autostart = "";

    
    logger.info('Running request for plugin \"'+ plugin_name +'\" with parameter json: '+plugin_json);
    
    
    try{
        //Reading the plugin configuration file
        var fs = require('fs');
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
        //Reading the json file as follows does not work because the result is cached!
        //var pluginsConf = require("./plugins.json");
    }
    catch(err){
        logger.error('Error parsing JSON file ./plugins.json');
        //return 'Internal server error';
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
	logger.info("Plugin successfully loaded!");
        
        //Check the status to be decided
	var status = pluginsConf.plugins[plugin_name].status;
        if (status == "off" || status == "on"){
            
            logger.info("Plugin " + plugin_name + " being started");
            
            //Create a new process that has plugin-wrapper as code
            var cp = require('child_process');
            var child = cp.fork('./call-wrapper');
	    
            
            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            }
            
	      
            
            child.on('message', function(msg) {
	   
	      if(msg.name != undefined){
		
		
		if (msg.status === "alive"){
		  
		  
		      //Creating the plugin json schema
		      var schema_outputFilename = './plugin_conf/'+plugin_name+'.json';
		      fs.writeFile(schema_outputFilename, plugin_json, function(err) {
			
			  if(err) {
			      logger.error('Error parsing '+plugin_name+'.json file: ' + err);
			      //return 'Internal server error';
			      
			  } else {
			    
			      logger.info('Plugin JSON schema saved to ' + schema_outputFilename);
	      
			      
			      // - change the plugin status from "off" to "on" and update the PID value
			      pluginsConf.plugins[plugin_name].status = "on";
			      pluginsConf.plugins[plugin_name].pid = child.pid;
			      
			      var outputFilename = './plugins.json';
			      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				
				  if(err) {
				      logger.error('Error writing ./plugins.json file: ' + err);
				  } else {
				      logger.info("JSON file plugins.json updated -> " + plugin_name + ':  status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
				  }
				  
			      });

			      
			  }
		      });
		      
		  
		  
		} else if(msg.status === "finish") {
		  
		  
		  logger.info("RESULT: ", msg.logmsg);
		  
		  d.resolve(msg.logmsg);
      
		  
		  
		} else if(msg.status === "fault") {
		  
		  
		  logger.info("RESULT: ", msg.logmsg);
		  
		  d.resolve(msg.logmsg);
      
		  
		  
		} else if(msg.level === "error") {
		  
		  logger.error(msg.name + ": " + msg.logmsg);
		  
		} else if(msg.level === "warn") {
		  
		  logger.warn(msg.name + ": " + msg.logmsg);
		  
		}  
		else{
		  //level info
		  logger.info(msg.name + ": " + msg.logmsg);
		  
		  
		  
		  

		}
		
	      }
	      else{
		//serve per gestire il primo messaggio alla creazione del child
		logger.info(msg);
	      }
	      

	      
	    });
 
	    
	    //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
	    child.send(input_message); 
	    
	    return d.promise;
	    //return "OK - CALL";
	    

	    

        }
        else{
            logger.warn("Call already started!");
            return 'Call already started on this board!';
        }
        
    }
    else{
      // Here the plugin does not exist
      logger.warn("Call \"" + plugin_name + "\" does not exist on this board!");
      return 'Call does not exist on this board!';
    }
}






//This function restarts all active plugins after a crash of Lightning-rod or a reboot of the board and starts  at boot all the plugins with "autostart" paramenter set true.
exports.restartAllActivePlugins = function (){
    
    logger.info('Restarting all the already scheduled plugins');
    
    //In order to create a plugin-wrapper process for each active plugin
    var cp = require('child_process');
    
    // create a list of child_process one for each active plugin
    var child = [];
    
    var outputFilename = './plugins.json';
    
    //Reading the plugins configuration file
    try{
        var fs = require('fs');
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
    }
    catch(err){
        logger.info('Error parsing JSON file ./plugins.json');
    }
    
   
    
    /*
    // TEST FOR
    console.log('new scope');
    for(var i = 0; i < 5; i++) {
    (function(i) {
      setTimeout(function() {console.log('st2:'+i)}, 0);
    })(i);
    }

    */
  
    
    // Get the plugin json object list
    var plugins_keys = Object.keys( pluginsConf["plugins"] );

    // Get the number of plugins in the list "plugins_keys" in order to use it in the next loop
    var plugin_num = plugins_keys.length; 
    logger.info('Number of plugins: '+ plugin_num);
    
    
    // Loop used to find the active plugin at the boot of the board or after a crash of L-R. In particular this loop use the setTimeout function in order to avoid to start at the same time the plugins that use the "board.connect" function.
    for(var i = 0; i < plugin_num; i++) {
      
      // We used this construct "function(i)" because with javascript and nodejs "the code within the function is only executed after the loop has been completed". 
      (function(i) {
	
	//Moreover "setTimeout() ensures that the function is only executed at some later stage."
	//At the moment we set the timeout at 5 seconds between the exection of the plugins to avoid the simultaneously connection to the board ("board.connect").
	setTimeout(function() {
	      
	  
	      var plugin_name = plugins_keys[ i ];

	      logger.info("|");
	      // Get the plugin's configuration.
	      var plugin_json_name = "./plugin_conf/"+plugin_name+".json";
	      var status = pluginsConf.plugins[plugin_name].status;
	      var pid = pluginsConf.plugins[plugin_name].pid;
	      var autostart = pluginsConf.plugins[plugin_name].autostart;
	      
	      logger.info("|--> " + plugin_name + ': autostart < ' + autostart + ' > - status < '+ status + ' > ' + pid);

	      // The board restarts all the plugins with status "on" (this status happens after a crash of L-R/board) or with autostart parameter set at true (because some plugins need to start at boot time).
	      if (status == "on" || autostart == "true"){
		
		//Check PID value
		if (pid == null || pid =='') {      //if (eval ("typeof " + pid) === 'undefined'){
	  
		    // This parameter is not specified only if the user KILLED/STOPPED the plugin execution previously. So in this case the plugin will be restarted because has autostart set at "true" and the board is at boot time.
		    logger.info("|----> Plugin " + plugin_name + " being restarted with this json schema:")
    
		} else {
	  
		    // otherwise, if the PID is specified, this means: 
		    try{
			// the L-R crashed... so we need to kill all the child_process of each plugin before to start them again;
			process.kill(pid);
			pluginsConf.plugins[plugin_name].pid = "";
			logger.info("|----> Plugin " + plugin_name + " had a PID and it was just killed!");
			logger.info("|----> " + plugin_name + " being restarted with this json schema:")
		    }
		    catch(err){
		        // the board crashed for a power failure... so we don't need to kill any child_process.
			logger.warn('|----> The PID ('+ pid +') of the plugin ('+plugin_name+') was already killed!');
		    }
		  
		}
		
		//check if plugin json schema exists:
		//nuovo metodo di verifica esistenza file ma non funzionante! DA RIVERIFICARE
		      	    /*
			    fs.statSync(plugin_json_name, function(err, stat) {
			      
				if(err == null) {
				    file_exist = true;
				    logger.info("|---->  file exists" + file_exist); 
				  
				} else {
				    file_exist = false;
				    logger.info("|---->  file NOT exists" + file_exist); 
				}
				
			    });
			    */

		// If the schema json file exists the board will create a child_process to restart the plugin and update the status and the PID value	
		if (fs.existsSync(plugin_json_name) === true){

		    //Create a new process that has plugin-wrapper as code
		    try{

			child[plugin_name] = cp.fork('./plugin-wrapper');
			var plugin_json_schema = JSON.parse(fs.readFileSync(plugin_json_name));
			var input_message = {
			    "plugin_name": plugin_name,
			    "plugin_json": plugin_json_schema
			}

			logger.info("|----> "+ fs.readFileSync(plugin_json_name));
			child[plugin_name].send(input_message);

		    }
		    catch(err){
			logger.error('|----> Error parsing JSON file '+ plugin_json_name +': ' + err);
		    }	
		    
		    
		    //updates the JSON file plugins.json
		    try{
		      
		      pluginsConf.plugins[plugin_name].pid = child[plugin_name].pid;	      
		      pluginsConf.plugins[plugin_name].status = "on";

		      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
			  if(err) {
			      logger.error(err);
			  } else {
			      logger.info("|----> JSON file " + outputFilename + " updated!");
			  }
		      });
		      
		    }
		    catch(err){
			logger.error('|----> Error writing JSON file ./plugins.json: ' + err);
		    } 
		    
		    
		    
		  
		} else{
		  //If the schema json file doesn't exist the related plugin will be not restarted and the value of its PID will be cleaned.
		  
		  //updates the JSON file plugins.json
		  try{
		    
		    logger.warn('|----> I can not restart '+ plugin_name +'!!! JSON file '+ plugin_json_name +' does not exist!');
		    
		    pluginsConf.plugins[plugin_name].pid = "";

		    fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
			if(err) {
			    logger.error(err);
			} else {
			    logger.info("|----> JSON file " + outputFilename + " updated: PID value cleaned!");
			}
		    });
		    
		    logger.warn('|----> Please call the RUN command again for the plugin: '+ plugin_name);
		    
		  }
		  catch(err){
		      logger.error('|----> Error writing JSON file ./plugins.json: ' + err);
		  } 
		  
		  
		}		  

		
		
	      // END IF STATUS
	      } else {
		  logger.info("|----> Plugin " + plugin_name + " with status OFF and autostart FALSE!");
	      }
		  
		
			  
	}, 5000*i);  // end of setTimeout function	
	
      })(i);  // end of the function(i)	
      
    } // end of the for loop
    

}

//This function runs a plugin in a new process
exports.run = function (args){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    
    // The autostart parameter at RUN stage is OPTIONAL. It is used at this stage if the user needs to change the boot execution configuration of the plugin after the INJECTION stage.
    var plugin_autostart = "";

    
    logger.info('Running request for plugin \"'+ plugin_name +'\" with parameter json: '+plugin_json);
    
    
    try{
        //Reading the plugin configuration file
        var fs = require('fs');
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));

    }
    catch(err){
        logger.error('Error parsing JSON file ./plugins.json');
        return 'Internal server error';
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
	logger.info("Plugin successfully loaded!");
        
        //Check the status
        var status = pluginsConf.plugins[plugin_name].status;
        
        if (status == "off"){
            
            logger.info("Plugin " + plugin_name + " being started");
            
            //Create a new process that has plugin-wrapper as code
            var cp = require('child_process');
            var child = cp.fork('./plugin-wrapper');
            
            //Prepare the message I will send to the process with name of the plugin to start and json file as argument
            var input_message = {
                "plugin_name": plugin_name,
                "plugin_json": JSON.parse(plugin_json)
            }
            
	      
            
            child.on('message', function(msg) {
	   
	      if(msg.name != undefined){
		
		
		if (msg.status === "alive"){
		  
		  
		      //Creating the plugin json schema
		      var schema_outputFilename = './plugin_conf/'+plugin_name+'.json';
		      fs.writeFile(schema_outputFilename, plugin_json, function(err) {
			
			  if(err) {
			      logger.error('Error parsing '+plugin_name+'.json file: ' + err);
			      return 'Internal server error';
			      
			  } else {
			    
			      logger.info('Plugin JSON schema saved to ' + schema_outputFilename);
	      
			      // Reading the plugins.json configuration file
			      try{
				
				  var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
				  
				  var pluginsSchemaConf = JSON.parse(fs.readFileSync(schema_outputFilename, 'utf8'));
				  
				  //Get the autostart parameter from the schema just uploaded
				  plugin_autostart = pluginsSchemaConf.autostart;
				  

			      }
			      catch(err){
				  logger.error('Error parsing plugins.json configuration file: ' + err);
				  return 'Internal server error';
			      }
			      
			      
			      
			      // Updating the plugins.json file:
			      // - check if the user changed the autostart parameter at this stage
			      if(plugin_autostart != undefined){
				
				  pluginsConf.plugins[plugin_name].autostart = plugin_autostart;
				  logger.info("Autostart parameter set by user to " + plugin_autostart);

			      } else {
				
				  logger.info("Autostart parameter not changed!");
				
			      }
			      
			      // - change the plugin status from "off" to "on" and update the PID value
			      pluginsConf.plugins[plugin_name].status = "on";
			      pluginsConf.plugins[plugin_name].pid = child.pid;
			      
			      var outputFilename = './plugins.json';
			      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				
				  if(err) {
				      logger.error('Error writing ./plugins.json file: ' + err);
				  } else {
				      logger.info("JSON file plugins.json updated -> " + plugin_name + ': autostart < ' + pluginsConf.plugins[plugin_name].autostart + ' > - status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
				  }
				  
			      });

			      
			  }
		      });
		      
		      
		      
		      
		      		  
		  
		  
		  
		  
		  
		  
		} else if(msg.level === "error") {
		  
		  logger.error(msg.name + ": " + msg.logmsg);
		  
		} else if(msg.level === "warn") {
		  
		  logger.warn(msg.name + ": " + msg.logmsg);
		  
		}  
		else{
		  //level info
		  logger.info(msg.name + ": " + msg.logmsg);

		}
		
	      }
	      else{
		//serve per gestire il primo messaggio alla creazione del child
		logger.info(msg);
	      }

	      
	    });
            
	    
	    //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
	    child.send(input_message); 

	    
	    return 'OK - Plugin running!';


        }
        else{
            logger.warn("Plugin already started!");
            return 'Plugin already started on this board!';
        }
        
    }
    else{
      // Here the plugin does not exist
      logger.warn("Plugin \"" + plugin_name + "\" does not exist on this board!");
      return 'Plugin does not exist on this board!';
    }
}


exports.kill = function (args){
    
    var plugin_name = String(args[0]);

    //Reading the plugin configuration file
    var fs = require('fs');
    var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var pluginsConf = require("./plugins.json");
    
          
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
      
        var status = pluginsConf.plugins[plugin_name].status;
	var autostart = pluginsConf.plugins[plugin_name].autostart;
	
        if (status == "on"){
	  
	    logger.info("Plugin " + plugin_name + " being stopped!");
            //console.log("Plugin " + plugin_name + " being stopped");
            
            var pid = pluginsConf.plugins[plugin_name].pid;
            process.kill(pid);
            pluginsConf.plugins[plugin_name].status = "off";
            pluginsConf.plugins[plugin_name].pid = "";

            
            // updates the JSON file
            var fs = require("fs");
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
		    logger.error(err);
                    //console.log(err);
                } else {
		    logger.info("JSON saved to " + outputFilename);
                    //console.log("JSON saved to " + outputFilename);
                }
            });
	    
	    
	    // delete the plugin json configuration file if it doesn't have to be executed at boot time
	    if (autostart == "false"){
	    
		fs.unlink('./plugin_conf/'+plugin_name+'.json', function (err) {
		  if (err) throw err;
		    logger.info('JSON schema of '+ plugin_name +' successfully deleted!');
		});
	    }
	    
            return 'OK - plugin killed!';
        }
        else{
                logger.warn("Plugin is not running on this board!");
		//console.log("Plugin already stopped.");
                return 'Plugin is not running on this board!';

        }
        
    }    
}

exports.injectPlugin = function(args){
    
    // Parsing the input arguments
    plugin_name = String(args[0]);
    plugin_code = String(args[1]);
    
    // The autostart parameter is used to set the boot execution configuration of the plugin.
    autostart = String(args[2]);
    
    console.log("Called RPC with plugin_name = " + plugin_name + ", autostart = " + autostart + ", plugin_code = " + plugin_code);
    
    var fs = require("fs");
    
    // Writing the file
    var fileName = './plugins/' + plugin_name + '.js';
    fs.writeFile(fileName, plugin_code, function(err) {
      
        if(err) {
	    logger.error('Error writing '+ fileName +' file: ' + err);
            //console.log('Error writing '+ fileName +' file: ' + err);
	    
	    return 'Error writing '+ fileName +' file: ' + err;
	    
        } else {
	  
	    logger.info("Plugin " + fileName + " injected successfully!");
            //console.log("Plugin " + fileName + " injected successfully");
            
            //Reading the measure configuration file
            var fs = require('fs');
            var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
            
            //Update the data structure                    
            pluginsConf.plugins[plugin_name] = {};                
            pluginsConf.plugins[plugin_name]['status'] = "off";
	    
	    if(autostart != undefined){
		pluginsConf.plugins[plugin_name]['autostart'] = autostart;
		
	    } else {
	      
		pluginsConf.plugins[plugin_name]['autostart'] = false;
	      
	    }
            
            //Updates the JSON file
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
		    logger.error('Error writing ./plugins.json file: ' + err);
		    //console.log('Error writing ./plugins.json file: ' + err);
		    return 'Error writing ./plugins.json file: ' + err;
		    
                } else {
		    logger.info("Plugins JSON configuration file saved to " + outputFilename);
                    //console.log("Plugins JSON configuration file saved to " + outputFilename);
		    //return "Plugins JSON configuration file saved to " + outputFilename;
                }
            });
	    
        }
    });
    
    return "Plugin injected successfully!"; 
}


//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPluginCommands = function (session){
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    logger.info('Exporting plugin commands to the Cloud');
    //console.log('Exporting plugin commands to the Cloud');
    
    //Register all the module functions as WAMP RPCs
    //session.register(boardCode+'.command.rpc.plugin.call_sync', exports.call_sync);
    session.register(boardCode+'.command.rpc.plugin.run', exports.run);
    session.register(boardCode+'.command.rpc.plugin.kill', exports.kill);    
    session.register(boardCode+'.command.rpc.injectplugin', exports.injectPlugin);
    session.register(boardCode+'.command.rpc.restartAllActivePlugins', exports.restartAllActivePlugins);
    session.register(boardCode+'.command.rpc.plugin.call', exports.call);
}

