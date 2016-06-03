/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto,, Nicola Peditto
* 
*/

//service logging configuration: "managePlugins"   
var logger = log4js.getLogger('managePlugins');
logger.setLevel(loglevel);

var fs = require("fs");
var Q = require("q");
var cp = require('child_process');  //In order to create a plugin-wrapper process for each active plugin.
var running = require('is-running');  //In order to verify if a plugin is alive or not.


var plugins = {}
var outputFilename = './plugins.json';
    
    



function pluginStarter(plugin_name, timer, pluginsConf, plugin_json_name, skip) {

      try{
	
	  // Get the plugin's configuration.
	  pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
	  
	  var status = pluginsConf.plugins[plugin_name].status;
	  var pid = pluginsConf.plugins[plugin_name].pid;
	  var autostart = pluginsConf.plugins[plugin_name].autostart;
		
    
	  // The board restarts all the plugins with status "on" (this status happens after a crash of L-R/board) or with autostart parameter set at true (because some plugins need to start at boot time).
	  if (status == "on" || autostart == "true"){
	    
	    
		//if (pid == null || pid =='') {
		if (pid == '') {
		  
		    // if the pid of plugin is empty (wrong status)
		  
		    //console.log(plugin_name + " - PID NULL and running = " + running(pid))
		    plugins[plugin_name]={
		      child: "",
		      pid: pid,
		      alive: false,
		      timer: timer
		    }
		
		}else if( pid == null){
		  
		    // if the plugin was just injected
		  
		    skip = "true";
		    
		    plugins[plugin_name]={
		      child: "",
		      pid: pid,
		      alive: null,
		      timer: timer
		    }
		    
		}else{
		  
		    // if the pid is specified and we came from reboot of the board/LR or after a crash of the plugin process
		  
		    //console.log(plugin_name + " - PID "+pid+" and running = " + running(pid))
		    plugins[plugin_name]={
		      child: "",
		      pid: pid,
		      alive: running(pid),
		      timer: timer
		    }
		  
		}
		
				
		if( plugins[plugin_name].alive === true ){
		    // the plugin is normally running
		    logger.info('[PLUGIN] - PluginChecker - '+ plugin_name + ' with PID: ' + plugins[plugin_name].pid + ' alive: '+ plugins[plugin_name].alive );
		    
		}
		else if( skip === "true") {
		  
		    // the plugin is in injected state and it doesn't need to be restarted
		    logger.info("[PLUGIN] - " + plugin_name + ' is a new plugin! status: injected - It is needed to start it the first time!' );
		    clearPluginTimer(plugin_name);
		    
		}
		else if( plugins[plugin_name].alive === false || skip === "false") {
		  
		    // the plugin is not alive: we are after a reboot of the board/LR or after a crash of the plugin process
		    logger.warn( '[PLUGIN] - PluginChecker - '+ plugin_name + ' - No such process found with PID '+plugins[plugin_name].pid+'!'+ ' - alive: '+ plugins[plugin_name].alive +' - Restarting...');
		    
		    // If the schema json file exists the board will create a child_process to restart the plugin and update the status and the PID value	
		    if (fs.existsSync(plugin_json_name) === true){

			//Create a new process that has plugin-wrapper as code
			try{

			    plugins[plugin_name].child = cp.fork('./plugin-wrapper');
			    
			    var plugin_json_schema = JSON.parse(fs.readFileSync(plugin_json_name));
			    var input_message = {
				"plugin_name": plugin_name,
				"plugin_json": plugin_json_schema
			    }

			    logger.info("[PLUGIN] ----> "+ plugin_name + " - Input parameters: "+ fs.readFileSync(plugin_json_name));
			    plugins[plugin_name].child.send(input_message);

			}
			catch(err){
			    logger.error('[PLUGIN] ----> Error starting '+plugin_name+' plugin: ' + err);
			}	
			
			
			//updates the JSON file plugins.json
			try{
			  
			      pluginsConf.plugins[plugin_name].pid = plugins[plugin_name].child.pid;	      
			      pluginsConf.plugins[plugin_name].status = "on";

			      fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				  if(err) {
				      logger.error('[PLUGIN] ----> '+ plugin_name + ' - Error writing JSON file ' + outputFilename + ': ' + err);
				  } else {
				      logger.debug("[PLUGIN] ----> "+ plugin_name + " - JSON file " + outputFilename + " updated!");
				  }
			      });
			  
			}
			catch(err){
			      logger.error('[PLUGIN] ----> '+ plugin_name + ' - Error updating JSON file ' + outputFilename + ': ' + err);
			} 
			
			
			
		      
		    } else{
		      //If the schema json file doesn't exist the related plugin will be not restarted and the value of its PID will be cleaned.
		      
		      //updates the plugins.json JSON file
		      try{
			
			    logger.warn('[PLUGIN] ----> '+ plugin_name + ' - I can not restart plugin!!! JSON file '+ plugin_json_name +' does not exist!');
			    
			    pluginsConf.plugins[plugin_name].pid = "";

			    fs.writeFile(outputFilename, JSON.stringify(pluginsConf, null, 4), function(err) {
				if(err) {
				    logger.error('[PLUGIN] ----> '+ plugin_name + ' - Error writing JSON file ' + outputFilename + ': ' + err);
				} else {
				    logger.info('[PLUGIN] ----> '+ plugin_name + ' - JSON file ' + outputFilename + ' updated: PID value cleaned!');
				}
			    });
			    
			    logger.warn('[PLUGIN] ----> '+ plugin_name + ' - Please call the RUN command again for this plugin!');
			
		      }
		      catch(err){
			    logger.error('[PLUGIN] ----> '+ plugin_name + ' - Error updating JSON file ' + outputFilename + ': ' + err);
		      } 
		      
		      
		    }	
		    
		    
		    
		}		

		
		
	  }

	  
      }
      catch(err){
	  logger.error('[PLUGIN] --> '+ plugin_name + ' - Error loading plugin: ' + err);
      }
      
		
  

    
}

function clearPluginTimer(plugin_name) {
  
    try{
      
	  if( plugins[plugin_name].timer == null){
	    
	      logger.info("[PLUGIN] --> " +plugin_name+ ": no timer to clear!");
	      
	  }else{
	      clearInterval( plugins[plugin_name].timer );

	      logger.debug("[PLUGIN] --> " + plugin_name +" - "+ JSON.stringify(plugins[plugin_name]) + " timer cleared!");
	  }
	  
    }  
    catch(err){
	logger.error('[PLUGIN] --> Error in clearing timer for plugin '+plugin_name+': '+ err);
    }
    
}
    
exports.pluginKeepAlive = function (plugin_name){
   
    try{
	  
	  // Get the plugin's configuration.
	  var pluginsConf = JSON.parse(fs.readFileSync(outputFilename, 'utf8'));
	  var status = pluginsConf.plugins[plugin_name].status;
	  var autostart = pluginsConf.plugins[plugin_name].autostart;
	  
	  var plugin_json_name = "./plugin_conf/"+plugin_name+".json";
	  
	  var skip = "false";
	  
	  if (status == "on" || autostart == "true"){
	    
	      pluginStarter(plugin_name, null, pluginsConf, plugin_json_name, skip);

	      if(status != "injected"){
		
		  var timer = setInterval(function() {
		    
		      pluginStarter(plugin_name, timer, pluginsConf, plugin_json_name, skip);

		  //}, 60000);	
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



	

    

}

exports.pluginsLoader = function (){
  
    logger.info('[PLUGIN] - Plugins loader is running!');

    try{
      
	  // Get the plugin's configuration.
	  var pluginsConf = JSON.parse(fs.readFileSync('./plugins.json', 'utf8'));
	  
	  // Get the plugin json object list
	  var plugins_keys = Object.keys( pluginsConf["plugins"] );

	  // Get the number of plugins in the list "plugins_keys" in order to use it in the next loop
	  var plugin_num = plugins_keys.length; 
	  //logger.info('Number of plugins: '+ plugin_num);
	  
	  logger.info('[PLUGIN] |- Restarting enabled plugins on board: ');

	  for(var i = 0; i < plugin_num; i++) {
	    
	    (function(i) {
	      
	      var plugin_name = plugins_keys[ i ];
	      var plugin_json_name = "./plugin_conf/"+plugin_name+".json";
	      var status = pluginsConf.plugins[plugin_name].status;
	      var autostart = pluginsConf.plugins[plugin_name].autostart;
	      
	      logger.info( '[PLUGIN] |--> '+ plugin_name + ' - status: '+ status +' - autostart: '+autostart);

	      setTimeout( function() {
	      
		exports.pluginKeepAlive(plugin_name);
		
		  
	      }, 7000*i);
	      
	    })(i);
	    
	  } 
    }
    catch(err){
	logger.warn('[PLUGIN] - Error parsing ./plugins.json: '+ err);
    }

}



