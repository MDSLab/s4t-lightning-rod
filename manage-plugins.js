//ADESSO NON FUNZIONA PERCHé LA CHIAMATA REST NON RITORNA CORRETTAMENTE
//Per adesso stiamo considerando processi asincroni che non restituiscono nulla
//Per far restituire qualcosa alla funzione run (almeno se il processo è stato lanciato correttamente) credo che si debbano usare le promise ma non sono sicuro (si dovrebbe domandare a quelli di TAVENDO se è possibile in WAMP dichiarare una RPC con una funziona asincrona ed eventualmente come).


//service logging configuration: "managePlugins"   
var logger = log4js.getLogger('managePlugins');






//This function restarts all active plugins after a crash of Lightning-rod or a reboot of the board
exports.restartAllActivePlugins = function (){
    
    logger.info('Restarting all the already scheduled plugins');
    
    //In order to create a plugin-wrapper process for each active plugin
    var cp = require('child_process');
    var child = [];
    
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
  
    
    
    var plugins_keys = Object.keys( pluginsConf["plugins"] );

 
    var plugin_num = plugins_keys.length; 
    logger.info('Number of plugins: '+ plugin_num);
    
    //var file_exist = null;
    var outputFilename = './plugins.json';
    
    for(var i = 0; i < plugin_num; i++) {
      
      (function(i) {
	setTimeout(function() {
	      
	  
	      var plugin_name = plugins_keys[ i ];
	  
	      //console.log(plugins_keys[ i ]);
	      logger.info("|");
	      var plugin_json_name = "./schemas/"+plugin_name+".json";
	      var status = pluginsConf.plugins[plugin_name].status;
	      var pid = pluginsConf.plugins[plugin_name].pid;
	      var autostart = pluginsConf.plugins[plugin_name].autostart;
	      
	      logger.info("|--> " + plugin_name + ': autostart < ' + autostart + ' > - status < '+ status + ' > ' + pid);
				  
	      if (status == "on" || autostart == "on"){
		//Check pid: if this parameter is not specified 
		if (pid == null || pid =='') {      //if (eval ("typeof " + pid) === 'undefined'){
		  
		    logger.info("|----> Plugin " + plugin_name + " being restarted with this json schema:")
    
		} else {
	  
		    try{
			process.kill(pid);
			pluginsConf.plugins[plugin_name].pid = "";
			logger.info("|----> Plugin " + plugin_name + " had a PID and it was killed!");
			logger.info("|----> " + plugin_name + " being restarted with this json schema:")
		    }
		    catch(err){
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

		
		if (fs.existsSync(plugin_json_name) === true){
		    //If the schema json file exists the board will create a process to restart the plugin and update the status and the PID value

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
		  //If the schema json file doen't exist the related plugin will be not restarted and the value of its PID will be cleaned
		  
		  //updates the JSON file plugins.json
		  try{
		    
		    logger.warn('|----> JSON file '+ plugin_json_name +' does not exist!');
		    logger.warn('|----> I can not restart '+ plugin_name +' !!!');
		    pluginsConf.plugins[plugin_name].pid = "";

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
		  
		  
		}		  

		
		
	      // END IF STATUS
	      } else {
		  logger.info("|----> Plugin " + plugin_name + " status OFF!");
	      }
		  
		
		
				  
	}, 5000*i);
      })(i);
    }
    
    
    
   

}


//This function runs a plugin in a new process
exports.run = function (args){
    
    //Parsing the input arguments
    var plugin_name = String(args[0]);
    var plugin_json = String(args[1]);
    var plugin_autostart = "null"

    
    logger.info('Plugin '+ plugin_name +' JSON Schema: '+plugin_json);
    //console.log(new Date().toISOString() + ' - INFO - Plugin '+ plugin_name +' JSON Schema: '+plugin_json);
    
    
    try{
        //Reading the plugin configuration file
        var fs = require('fs');
        var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
        //Reading the json file as follows does not work because the result is cached!
        //var pluginsConf = require("./plugins.json");
    }
    catch(err){
        logger.error('Error parsing JSON file ./plugins.json');
        return 'Internal server error';
    }
    
    //If the plugin exists
    if(pluginsConf["plugins"].hasOwnProperty(plugin_name)){
        
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
            
            //I send the input to the wrapper so that it can launch the proper plugin with the proper json file as argument
            child.send(input_message);
            
//             //I wait for a message from the wrapper to know if it terminates
//             child.on('message', function(message) {
//                 if (message == "exiting"){
//                     pluginsConf.plugins[plugin_name].status = "on";
//                     
//                     //updates the JSON file
//                     var fs = require("fs");
//                     var outputFilename = './plugins.json';
//                     fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
//                         if(err) {
//                             console.log(err);
//                         } else {
//                             console.log("JSON saved to " + outputFilename);
//                         }
//                     });
//                 }
//                 
//                 else
//                     console.log("something very strange happened");
//             });
            
	    
	    
	    
	    //Creating plugin json schema
	    var schema_outputFilename = './schemas/'+plugin_name+'.json';
	    fs.writeFile(schema_outputFilename, plugin_json, function(err) {
                if(err) {
                    logger.error(err);
                } else {
                    logger.info('JSON SCHEMA saved to ' + schema_outputFilename);
    
		    //Reading the plugin json schema configuration file in order to get autostart parameter 
		    try{
			var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
			var pluginsSchemaConf = JSON.parse(fs.readFileSync(schema_outputFilename, 'utf8'));
			
			logger.info("SCHEMA: " + fs.readFileSync(schema_outputFilename, 'utf8'));
			//Get the autostart parameter 
			plugin_autostart = pluginsSchemaConf.autostart;
			logger.info("plugin_autostart: " + plugin_autostart);
		    }
		    catch(err){
			logger.error('Error parsing JSON file '+ schema_outputFilename + ": " + err);
			return 'Internal server error';
		    }
		    
		    
		    
		    //updates the JSON file
		    pluginsConf.plugins[plugin_name].status = "on";
		    pluginsConf.plugins[plugin_name].pid = child.pid;
		    pluginsConf.plugins[plugin_name].autostart = plugin_autostart;
		    
		    logger.info("CHECK SCHEMA: " + plugin_name + ': autostart < ' + pluginsConf.plugins[plugin_name].autostart + ' > - status < '+ pluginsConf.plugins[plugin_name].status + ' > ' + pluginsConf.plugins[plugin_name].pid);
		    
		    var outputFilename = './plugins.json';
		    fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
			if(err) {
			    logger.error(err);
			} else {
			    logger.info("JSON saved to " + outputFilename);
			}
		    });
		    
		    
		    
		    

		    
                }
            });
	    
	    

	    
	    
	    

	    
	    
            return 'OK';
	    

	    

        }
        else{
            logger.warn("Plugin already started.");
            return 'Plugin already started on this board';
        }
        
    }
    else{
      //Here the plugin does not exist
      logger.warn("Plugin " + pluginname + " does not exists on this board");
      return 'Plugin does not exist on this board';
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
        if (status == "on"){
            console.log("Plugin " + plugin_name + " being stopped");
            
            var pid = pluginsConf.plugins[plugin_name].pid;
            process.kill(pid);
            pluginsConf.plugins[plugin_name].status = "off";
            pluginsConf.plugins[plugin_name].pid = "";

            
            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
	    
	    
	    //delete plugin json schema
	    fs.unlink('./schemas/'+plugin_name+'.json', function (err) {
	      if (err) throw err;
		console.log(new Date().toISOString() + ' - INFO - Json schema '+ plugin_name +' successfully deleted!');
	    });
	    
            return 'OK';
        }
        else{
                console.log("Plugin already stopped.");
                return 'Plugin is not running on this board';

        }
        
    }    
}


exports.injectPlugin = function(args){
    
    plugin_name = String(args[0]);
    plugin_code = String(args[1]);
    
    console.log("Called RPC with plugin_name = " + plugin_name + ", plugin_code = " + plugin_code);
    
    var fs = require("fs");
    
    //Writing the file
    var fileName = './plugins/' + plugin_name + '.js';
    fs.writeFile(fileName, plugin_code, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("Plugin " + fileName + " injected successfully");
            
            //Reading the measure configuration file
            var fs = require('fs');
            var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
            //Reading the json file as follows does not work because the result is cached!
            //var measuresConf = require("./measures.json");
            
            //Update the data structure                    
            pluginsConf.plugins[plugin_name] = {};                
            pluginsConf.plugins[plugin_name]['status'] = "off";
            
            //Updates the JSON file
            var outputFilename = './plugins.json';
            fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
        }
    });
}








//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportPluginCommands = function (session){
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    logger.info('Exporting plugin commands to the Cloud');
    //console.log('Exporting plugin commands to the Cloud');
    
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.plugin.run', exports.run);
    session.register(boardCode+'.command.rpc.plugin.kill', exports.kill);    
    session.register(boardCode+'.command.rpc.injectplugin', exports.injectPlugin);
    session.register(boardCode+'.command.rpc.restartAllActivePlugins', exports.restartAllActivePlugins);
  
}

