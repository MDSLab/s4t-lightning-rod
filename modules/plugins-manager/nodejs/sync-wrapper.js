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

var plugin_name;
var plugin_json;

var fs = require('fs');
var PLUGINS_SETTING = process.env.IOTRONIC_HOME + '/plugins/plugins.json';
var PLUGINS_STORE = process.env.IOTRONIC_HOME + '/plugins/';

process.once('message', function(message) {
  
    plugin_name = message.plugin_name;
    plugin_json = message.plugin_json;

    var plugin_folder = PLUGINS_STORE + plugin_name;
    var fileName = plugin_folder + "/" + plugin_name + '.js';
    
    if (fs.existsSync(fileName) === true){

        var plugin = require(plugin_folder + "/" + plugin_name);

        var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;
        var api = require(LIGHTNINGROD_HOME + '/modules/plugins-manager/nodejs/plugin-apis');
      
        process.send({ name: plugin_name, status: true , logmsg: "I'm alive!"});
        process.send({ name: plugin_name, level: "info" , logmsg: "starting..."});
        process.send({ name: plugin_name, status: "alive"});
      
        plugin.main(plugin_name, plugin_json, api, function(err, result){
	
            process.send({ name: plugin_name, status: "finish", logmsg: result});

        });

    }
    else{
      
        process.send({ name: plugin_name, status: "fault" , logmsg: "Call source file does not exist!"});
      
    }
    
});

process.on('exit', function(){
    
    process.send({ name: plugin_name, level: "warn" , logmsg: 'Process terminated: putting ' + plugin_name + ' to off'});
    
    try{
        //Reading the plugin configuration file
        var pluginsConf = JSON.parse(fs.readFileSync(PLUGINS_SETTING, 'utf8'));
    }
    catch(err){
	    process.send({ name: plugin_name, level: "error" , logmsg: 'Error parsing JSON file plugins.json'});
    }
        
    pluginsConf.plugins[plugin_name].status = "off";
    pluginsConf.plugins[plugin_name].pid = "";
             
    //updates the JSON file
    fs.writeFileSync(PLUGINS_SETTING, JSON.stringify(pluginsConf, null, 4));
    
});


