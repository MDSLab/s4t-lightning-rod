/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Andrea Rocco Lotronto, Nicola Peditto
* 
*/


//service logging configuration: "manageMeasures"
var logger = log4js.getLogger('manageMeasures');


function run(pin,period,read,elaborate){   
    return setInterval(function(){
        var readPlugin = require(read);
        var elaboratePlugin = require(elaborate);
        
        var rawData = readPlugin.read(board,pin);
        var data = elaboratePlugin.elaborate(rawData);
        
        console.log(data);
                
    },period,elaborate);
}

exports.start = function (id){
    
    //This is to force id to be of primitive type string 
    //In fact, if the function is called through WAMP id could be of object type String
    id = String(id);
        
    //Reading the measure configuration file
    var fs = require('fs');
    var measuresConf = JSON.parse(fs.readFileSync('./measures.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var measuresConf = require("./measures.json");
    
    if(measuresConf["measures"].hasOwnProperty(id)){
                
        var status = measuresConf.measures[id].status;
        
        if (status == "off"){
            var pin = measuresConf.measures[id].pin;
            var period = measuresConf.measures[id].period;
            var read_plugin = measuresConf.measures[id].read_plugin;
            var elaborate_plugin = measuresConf.measures[id].elaborate_plugin;
            console.log('activating ' + id);

            var command = id+"=run('"+pin+"',"+period+",'"+read_plugin+"','"+elaborate_plugin+"')";
        
            //starts the measure
            eval(command);
            
            measuresConf.measures[id].status = "on";
        
            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './measures.json';
            fs.writeFile(outputFilename, JSON.stringify(measuresConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                console.log("JSON saved to " + outputFilename);
                }
            });
        }
        else{
            console.log("Measure already started.");
        }
    }
}

exports.stop = function (id){
    
    //This is to force id to be of primitive type string 
    //In fact, if the function is called through WAMP id could be of object type String    
    id = String(id);
    
    //Reading the measure configuration file
    var fs = require('fs');
    var measuresConf = JSON.parse(fs.readFileSync('./measures.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var measuresConf = require("./measures.json");
    
    if(measuresConf["measures"].hasOwnProperty(id)){
        var status = measuresConf.measures[id].status;
        if (status == "on"){
            console.log('stopping ' + id);
            
            clearInterval(eval(id));
            measuresConf.measures[id].status = "off";
            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './measures.json';
            fs.writeFile(outputFilename, JSON.stringify(measuresConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
        }
        else{
                console.log("Measure already stopped.");
        }
        
    }    
}


exports.startAllMeasures = function (){
    //Reading the measure configuration file
    var fs = require('fs');
    var measuresConf = JSON.parse(fs.readFileSync('./measures.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var measuresConf = require("./measures.json");

    for(var id in measuresConf["measures"]){
        var status = measuresConf.measures[id].status;

        if (status == "off"){
            var pin = measuresConf.measures[id].pin;
            var period = measuresConf.measures[id].period;
            var read_plugin = measuresConf.measures[id].read_plugin;
            var elaborate_plugin = measuresConf.measures[id].elaborate_plugin;

            var command = id+"=run('"+pin+"',"+period+",'"+read_plugin+"','"+elaborate_plugin+"')";
            
            console.log('activating ' + id);

            //starts the measure
            eval(command);

            measuresConf.measures[id].status = "on";

            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './measures.json';
            fs.writeFile(outputFilename, JSON.stringify(measuresConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                    }
                });
            }
        else{
            console.log("Measure already started.");
        }
    }
}

exports.restartAllActiveMeasures = function (){
    
    logger.info('Restarting all the already scheduled measures');
    //console.log('Restarting all the already scheduled measures');
    
    //Reading the measure configuration file
    var fs = require('fs');
    var measuresConf = JSON.parse(fs.readFileSync('./measures.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var measuresConf = require("./measures.json");

    
    for(var id in measuresConf["measures"]){
        var status = measuresConf.measures[id].status;

        if (status == "on" && eval ("typeof " +id) === 'undefined'){
            var pin = measuresConf.measures[id].pin;
            var period = measuresConf.measures[id].period;
            var read_plugin = measuresConf.measures[id].read_plugin;
            var elaborate_plugin = measuresConf.measures[id].elaborate_plugin;

            var command = id+"=run('"+pin+"',"+period+",'"+read_plugin+"','"+elaborate_plugin+"')";
            
            console.log('activating ' + id);
            //starts the measure
            eval(command);

            measuresConf.measures[id].status = "on";

            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './measures.json';
            fs.writeFile(outputFilename, JSON.stringify(measuresConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
        }
    }
}

exports.stopAllMeasures = function (){
    
    //Reading the measure configuration file
    var fs = require('fs');
    var measuresConf = JSON.parse(fs.readFileSync('./measures.json', 'utf8'));
    //Reading the json file as follows does not work because the result is cached!
    //var measuresConf = require("./measures.json");

    for(var id in measuresConf["measures"]){
        var status = measuresConf.measures[id].status;
        if (status == "on"){
            console.log('stopping ' + id);

            clearInterval(eval(id));
            measuresConf.measures[id].status = "off";
            //updates the JSON file
            var fs = require("fs");
            var outputFilename = './measures.json';
            fs.writeFile(outputFilename, JSON.stringify(measuresConf, null, 4), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });
        }
        else{
                console.log("Measure already stopped.");
        }
    }
}

exports.injectMeasure = function(args){
    
    measure_name = String(args[0]);
    pin = String(args[1]);
    period = String(args[2]);
    read_plugin_name = String(args[3]);
    elaborate_plugin_name = String(args[4]);
    read_plugin_code = String(args[5]);
    elaborate_plugin_code = String(args[6]);
    
    console.log("Called RPC with measure_name = " + measure_name + ", pin = " + pin + ", period = " + period + ", read_plugin_name = " + read_plugin_name + ", elaborate_plugin_name = " + elaborate_plugin_name + ", read_plugin_code = " + read_plugin_code + ", elaborate_plugin_code = " + elaborate_plugin_code);
    
    var fs = require("fs");

    //Writing the first file
    var readFilename = './plugins/' + read_plugin_name + '.js';
    fs.writeFile(readFilename, read_plugin_code, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("Read plugin " + readFilename + " injected successfully");
            
            //Writing the second file
            var elaborateFilename = './plugins/' + elaborate_plugin_name + '.js';
            fs.writeFile(elaborateFilename, elaborate_plugin_code, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("Elaborate plugin " + elaborateFilename + " injected successfully");
                    
                    //Reading the measure configuration file
                    var fs = require('fs');
                    var measuresConf = JSON.parse(fs.readFileSync('./measures.json', 'utf8'));
                    //Reading the json file as follows does not work because the result is cached!
                    //var measuresConf = require("./measures.json");

                    
                    //Update the data structure                    
                    measuresConf.measures[measure_name] = {};                
                    measuresConf.measures[measure_name]['status'] = "off";
                    measuresConf.measures[measure_name]['pin'] = pin;
                    measuresConf.measures[measure_name]['period'] = period;
                    measuresConf.measures[measure_name]['read_plugin'] = "./plugins/" + read_plugin_name;
                    measuresConf.measures[measure_name]['elaborate_plugin'] = "./plugins/" + elaborate_plugin_name;
                    
                    //Updates the JSON file
                    var outputFilename = './measures.json';
                    fs.writeFile(outputFilename, JSON.stringify(measuresConf, null, 4), function(err) {
                        if(err) {
                            console.log(err);
                        } else {
                            console.log("JSON saved to " + outputFilename);
                        }
                    });
                }
            });
        }
    });
}



//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportMeasureCommands = function (session){
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    //logger.info('Exporting measure commands to the Cloud');
    
    //Register all the module functions as WAMP RPCs
    session.register(boardCode+'.command.rpc.measure.start', exports.start);
    session.register(boardCode+'.command.rpc.measure.stop', exports.stop);
    session.register(boardCode+'.command.rpc.measure.startallmeasures', exports.startAllMeasures);
    session.register(boardCode+'.command.rpc.measure.restartallactivemeasures', exports.restartAllActiveMeasures);
    session.register(boardCode+'.command.rpc.measure.stopallmeasures', exports.stopAllMeasures);
    session.register(boardCode+'.command.rpc.injectmeasure', exports.injectMeasure);
    
    logger.info('[WAMP-EXPORTS] Measures management commands exported to the cloud!')

}

