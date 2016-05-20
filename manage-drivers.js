/*
*				 Apache License
*                           Version 2.0, January 2004
*                        http://www.apache.org/licenses/
*
*      Copyright (c) 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Nicola Peditto
* 
*/

//service logging configuration: "manageDrivers"   
var logger = log4js.getLogger('manageDrivers');
logger.setLevel(loglevel);

var fs = require('fs');
var fuse = require('fuse-bindings')
var Q = require("q");

var session_drivers = null;
var boardCode = nconf.get('config:board:code');
var drivers = []; // List of drivers mounted in the board
var device0_file = '/sys/bus/iio/devices/iio:device0/enable';

file_list = {};
mp_list = {};
driver_name = ""
fd_index = 3 //fd index used by Unix as file descriptor: we can use this index starting from 3 

mode_lookup_table = {
  rw: 33188, 	//rw-r--r-- 100644
  r: 33060	//r--r--r-- 100444
}



function readdirFunction(driver_name){
  
    var readdir_function = function (mountpoint, cb) {
      
	logger.debug('[DRIVER] --> readdir(%s) - files list: %s', mountpoint, JSON.stringify(file_list[driver_name]) )
	//if (mountpoint === '/') return cb(0, [driver_name]);
	//if (mountpoint === '/'+driver_name) return cb(0, file_list[driver_name] );
	  
	if (mountpoint === '/') return cb(0, file_list[driver_name] );

	cb(0)
    }
    return readdir_function
}

function getattrFunction(driver_name){
    var getattr_function = function (mountpoint, cb) {
      
	logger.debug('[DRIVER] --> getattr(%s)', mountpoint)
	
	driver_mp_node = mp_list[driver_name]
	
	if(driver_mp_node[mountpoint].mp != undefined){
	  cb(0, driver_mp_node[mountpoint].mp )
	  return
	}
	
	cb(fuse.ENOENT)

    }
    return getattr_function
}


function openFunction(){
  
    var open_function = function (mountpoint, flags, cb) {
      
	fd_index = fd_index + 1
	
	logger.debug('[DRIVER] --> Open(%s, %d) - fd = %s', mountpoint, flags, fd_index);
	
	cb(0, fd_index) //cb(0, 42) // 42 is an fd
    }
    return open_function
}



function readFunction(driver_name, filename, mirror_board){
  
    var read_function = function (mountpoint, fd, buf, len, pos, cb) {
      
	  driver_mp_node = mp_list[driver_name];
	      
	  var driver = drivers[driver_name];
	      
	  if (driver_mp_node['/'].remote === "false"){
	      
	      logger.debug('[DRIVER] --> Read(%s, %d, %d, %d)', mountpoint, fd, len, pos);
	      
	      driver[driver_mp_node[mountpoint].read_function]( function(read_content){
		    var buffer = new Buffer(read_content.toString(), 'utf-8');
		    var str = ''+buffer.slice(pos);
		    if (!str)
			return cb(0);     
		    buf.write(str);
		    return cb(str.length);
	      });  
	      
	      
	  }else{
	    
	      var filename = mountpoint.replace('/','');
	    
	      logger.debug('[DRIVER] - REMOTE CALLING DRIVER to '+mirror_board + ' RPC called: s4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.read');
	      
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
    
    return read_function
    
}


exports.readRemote = function (args){

  var d = Q.defer();
  
  var driver_name = String(args[0]);
  var filename = String(args[1]);
  
  driver_mp_node = mp_list[driver_name];  
  
  var driver = drivers[driver_name];
  var remote = driver_mp_node['/'].remote;
  var mirror_board = driver_mp_node['/'].mirror_board;
  
  if (remote === "false"){
    
      driver[ driver_mp_node['/'+filename].read_function ](
      
	  function(read_content){

	      var buffer = new Buffer(read_content.toString(), 'utf-8');
	      var str = ''+buffer.slice(0);
	      if (!str)
		  return d.resolve(0); 
	      //var str = read_content.toString();
	      logger.info('[DRIVER] - Read REMOTE: '+driver_name+'['+filename+'] -> '+ str);
	      d.resolve(str);
		    
	  }
	
      ); 
      

  }else{
    
      var read_rpc_call = 's4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.read';
      
      logger.debug('[DRIVER] - REMOTE READ CALLING DRIVER to '+mirror_board + ' RPC called: '+ read_rpc_call);
      
      session_drivers.call( read_rpc_call, [driver_name, filename]).then(
				
	  function(read_content){
	    
	      var buffer = new Buffer(read_content.toString(), 'utf-8');
	      var str = ''+buffer.slice(0);
	      if (!str)
		  return d.resolve(0);      
	      logger.info('[DRIVER] --> Read REMOTE mirrored from '+mirror_board+': '+driver_name+'['+filename+'] -> '+ str);
	      d.resolve(str);

	  },
	  function (error) {
	      // call failed
	      logger.warn('[DRIVER] --> Read REMOTE mirrored from '+mirror_board+' failed! - Error: '+ JSON.stringify(error));
	      var error_log = "ERROR: " + error["error"]
	      d.resolve( error_log );
	  }
      );	
    
  }
  
    
  return d.promise;
    
}

 
function writeFunction(driver, driver_name){
  
      var write_function = function (mountpoint, fd, buffer, length, position, cb) {
	
	    logger.debug('[DRIVER] - Writing', buffer.slice(0, length));
	    content = buffer.slice(0, length);
	    logger.debug("[DRIVER] --> buffer content: " + content.toString());
	    logger.debug("[DRIVER] --> buffer length: " + length.toString());
	    
	    driver_mp_node = mp_list[driver_name]	  
	  
	    if (driver_mp_node[mountpoint].write_function === null){
	      
		cb(fuse.EACCES);
		
	    } else {
		driver[driver_mp_node[mountpoint].write_function ]( content, function(){
		    cb(length);
		});
	    }
	   
      } 
      
      return write_function
}

exports.NotAllowedRemoteFunction = function (args){
  
  return "Remote operation not allowed!"
  
  
}

exports.writeRemote = function (args){

  var d = Q.defer();
  
  var driver_name = String(args[0]);
  var filename = String(args[1]);
  var filecontent = String(args[2]); 
  
  driver_mp_node = mp_list[driver_name];  
  
  var driver = drivers[driver_name];
  var remote = driver_mp_node['/'].remote;
  var mirror_board = driver_mp_node['/'].mirror_board;
  
  if (remote === "false"){
    
      driver[ driver_mp_node['/'+filename].write_function ]( filecontent, function(){
	
	      logger.info('[DRIVER] - Write REMOTE: '+driver_name+'['+filename+'] -> completed!');
	      d.resolve("writing completed");	  
	
      });
      

  }else{
    
      var write_rpc_call = 's4t.'+mirror_board+'.driver.'+driver_name+'.'+filename+'.write';
      
      logger.debug('[DRIVER] - REMOTE WRITE CALLING DRIVER to '+mirror_board + ' RPC called: '+ write_rpc_call);
      
      session_drivers.call(write_rpc_call, [driver_name, filename, filecontent]).then(
				
	  function(result){
     
	      logger.info('[DRIVER] --> Write REMOTE mirrored from '+mirror_board+': '+driver_name+'['+filename+'] -> '+ result);
	      d.resolve(result);

	  },
	  function (error) {
	      // call failed
	      logger.warn('[DRIVER] --> Write REMOTE mirrored from '+mirror_board+' failed! - Error: '+ JSON.stringify(error));
	      var error_log = "ERROR: " + error["error"]
	      d.resolve( error_log );
	  }
      );	
    
  }
  
    
  return d.promise;
    
}



function MaskConversion(mode_b10){
  //var mode_b10 = 100644//40755
  mode_b8 = parseInt(mode_b10.toString(10), 8)
  //logger.info("from b10 "+mode_b10+" to b8 "+mode_b8)
  permission = mode_b8
  return permission
}

function HumanMaskConversion(mode){
  
  mode_b8 = parseInt(mode_b10.toString(10), 8)
  //logger.info("from b10 "+mode_b10+" to b8 "+mode_b8)
  permission = mode_b8
  return permission
}




function LoadDriver(driver_name, mountpoint, filename, remote, mirror_board, callback){
    
    var driver_path = "./drivers/"+driver_name;
    var driver_conf = driver_path+"/"+driver_name+".json";
    var driver_module = driver_path+"/"+driver_name+".js";
    var driver = require(driver_module);
    
    var rest_response = {};
    
    

    try{
      
	var driverJSON = JSON.parse(fs.readFileSync(driver_conf, 'utf8'));
	//logger.info(driverJSON);
	logger.debug('[DRIVER] -->  JSON file '+ driver_name +'.json successfully parsed!');
	
	driver_name = driverJSON.name; 
	//logger.debug("--> driver name: " + driver_name)
	
	var type = driverJSON.type; //logger.info("\tfile type: " + type)
	var permissions = MaskConversion(driverJSON.permissions); //logger.info("\tpermissions: " + MaskConversion(permissions))
	//var root_permissions = MaskConversion(driverJSON.root_permissions);
	var children = driverJSON.children; //logger.info("Files in the folder:")
	
	logger.info("[DRIVER] --> driver "+driver_name+" configuration loaded!");

	mp_list[driver_name]={}
	driver_mp_node = mp_list[driver_name]
	
	fuse_root_path='/';
	
	var root_mp = {
	    mtime: new Date(),
	    atime: new Date(),
	    ctime: new Date(),
	    size: 100,
	    mode: permissions,
	    uid: process.getuid(),
	    gid: process.getgid()
	}
	driver_mp_node[fuse_root_path]={
	    name: driver_name,
	    mp: {},
	    remote: remote,
	    mirror_board: mirror_board
	}
	
	driver_mp_node[fuse_root_path].mp=root_mp;
	driver_mp_node[fuse_root_path].type = "folder";

	
	file_list[driver_name]=[];
		
	children.forEach(function(file, idx, list) {
			    
	      logger.debug("[DRIVER] -->  analyzing file: "+file.name);
	      
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
	      }
		    
	      if(file.read_function != undefined){
		    var read_function = file.read_function;
	      }else{
		    var read_function = null
	      }
		      
		      
	      if(file.write_function != undefined){  
		    var write_function = file.write_function
	      }else{
		    var write_function = null
	      }	
			    
	      var file_mp = { 

		  mtime: new Date(),
		  atime: new Date(),
		  ctime: new Date(),
		  size: 100,
		  mode: MaskConversion(file.permissions),
		  uid: process.getuid(),
		  gid: process.getgid()

	      }

	      driver_mp_node[fuse_file_path].mp = file_mp;
	      driver_mp_node[fuse_file_path].name = file.name;
	      driver_mp_node[fuse_file_path].type = "file";
	      driver_mp_node[fuse_file_path].read_function = read_function;
	      driver_mp_node[fuse_file_path].write_function = write_function;
		    
		    

	      if(file.read_function != undefined){
				
		    session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.read', exports.readRemote ).then(
	      
			  function(registration){

			      driver_mp_node['/'+file.name].reg_read_function = registration;

			      logger.debug('[WAMP] --> '+driver_name+' - ' + file.name + ' read function registered!');
			      
			      if (idx === list.length - 1){ 
				
				  mp_list[driver_name] = driver_mp_node;
				  
				  logger.info("[DRIVER] -->  driver "+driver_name+" RPC read functions successfully registered!");
				  				  
			      }
			    
			  }
		      
		    );
		
		
	      }else{
		
		    session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.read', exports.NotAllowedRemoteFunction ).then(
	      
			  function(registration){

			      driver_mp_node['/'+file.name].reg_read_function = registration;

			      logger.debug('[WAMP] --> '+driver_name+' - ' + file.name + ' read function registered!');
			      
			      if (idx === list.length - 1){ 
				
				  mp_list[driver_name] = driver_mp_node;
				  
				  logger.info("[DRIVER] -->  driver "+driver_name+" RPC read functions successfully registered!");
				  				  
			      }
			    
			  }
		      
		    );		    
	      }	  
	      
	      if(file.write_function != undefined){  

		    session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.write', exports.writeRemote ).then(
	      
			  function(registration){

			      driver_mp_node['/'+file.name].reg_write_function = registration;

			      logger.debug('[WAMP] --> '+driver_name+' - ' + file.name + ' write function registered!');
			      
			      if (idx === list.length - 1){ 
				
				  mp_list[driver_name] = driver_mp_node;
				  
				  logger.info("[DRIVER] -->  driver "+driver_name+" RPC write functions successfully registered!");
				  				  
			      }
			    
			  }
		      
		    );
		
		    
	      }else{
		
		    session_drivers.register('s4t.'+boardCode+'.driver.'+driver_name+'.'+file.name+'.write', exports.NotAllowedRemoteFunction ).then(
	      
			  function(registration){

			      driver_mp_node['/'+file.name].reg_write_function = registration;

			      logger.debug('[WAMP] --> '+driver_name+' - ' + file.name + ' write function registered!');
			      
			      if (idx === list.length - 1){ 
				
				  mp_list[driver_name] = driver_mp_node;
				  
				  logger.info("[DRIVER] -->  driver "+driver_name+" RPC write functions successfully registered!");
				  				  
			      }
			    
			  }
		      
		    );		    
	      }
	      

	      if (idx === list.length - 1){ 
		
		  logger.info("[DRIVER] -->  Available files for "+driver_name+" %s", JSON.stringify(file_list[driver_name]))
						  
	      }
			      
			      
	   

	      
	  
	});

	
	
	var device = nconf.get('config:device');
	logger.info('[DRIVER] --> GPIO device for '+device+': ' + device0_file);
	
	switch(device){
	  
	    case 'arduino_yun':


		  // ENABLING YUN DEVICE "device_0"
		  fs.writeFile(device0_file, '1', function(err) {
		    
		      if(err) {
			
			  logger.error('[DRIVER] --> Error writing device0 file: ' + err);
			  
		      } else {
			
			  logger.debug("[DRIVER] -->  device0 successfully enabled!");
			  
			  //logger.info("FULL FILE LIST %s", JSON.stringify(file_list))
			  
			  try{
				
				fuse.mount(mountpoint, {
				  readdir: readdirFunction(driver_name),
				  getattr: getattrFunction(driver_name),
				  open: openFunction(),
				  read: readFunction(driver_name, filename, mirror_board),
				  write: writeFunction(driver, driver_name) 
				})
		  
				drivers[driver_name] = driver;
				
				rest_response.message = 'driver '+driver_name+' successfully mounted!';
				rest_response.result = "SUCCESS";
				
				callback(rest_response)
				
			  }
			  catch(err){
			      
			      rest_response.message = "ERROR during "+driver_name+" (fuse) mounting: " +err;
			      rest_response.result = "ERROR";
				
			      logger.error("[DRIVER] --> " + rest_response.message);
			      
			      callback(rest_response)
			      
			  }
			  
			  
			  
		      }
		      
		  }); 


	      
		break
		
	    case 'laptop':                      
	    case 'raspberry_pi':
		  
		  try{
			
			fuse.mount(mountpoint, {
			  readdir: readdirFunction(driver_name),
			  getattr: getattrFunction(driver_name),
			  open: openFunction(),
			  read: readFunction(driver_name, filename, mirror_board),
			  write: writeFunction(driver, driver_name) 
			})
	  
			drivers[driver_name] = driver;
			
			rest_response.message = 'driver '+driver_name+' successfully mounted!';
			rest_response.result = "SUCCESS";
			
			callback(rest_response)
			
		  }
		  catch(err){
		      
		      rest_response.message = "ERROR during "+driver_name+" (fuse) mounting: " +err;
		      rest_response.result = "ERROR";
			
		      logger.error("[DRIVER] --> " + rest_response.message);
		      
		      callback(rest_response)
		      
		  }
	      
		break  
		
	    default:
		//DEBUG MESSAGE
		logger.warn('[DRIVER] - Device "' + device + '" not supported!');
		logger.warn('[DRIVER] - Supported devices are: "laptop", "arduino_yun", "raspberry_pi".');
		break;
		
		
	}
	

	
	

	

    }
    catch(err){
	logger.error('[DRIVER] --> Error during driver loading: '+err);
    }  
  
}



//This function mounts a driver
exports.mountDriver = function (args){
      
    //Parsing the input arguments
    var driver_name = String(args[0]);
    var filename = String(args[1]);
    var remote = String(args[2]);
    var mirror_board = String(args[3]);

    logger.info("[DRIVER] - Driver "+driver_name+" MOUNTING...");
    
    var rest_response = {};

    //var mountpoint = '../drivers/'+driver_name+'/driver';
    var mountpoint = '../drivers/'+driver_name;
    
    
    var d = Q.defer();
    
    logger.debug("[DRIVER] --> Driver folder ("+mountpoint+") checking...")
    
    try{
      
	  if ( fs.existsSync(mountpoint) === false ){
	    
		//Create the directory, call the callback.
		fs.mkdir(mountpoint, 0755, function() {

		    logger.debug("[DRIVER] ----> folder "+mountpoint+" CREATED!");
		    LoadDriver(driver_name, mountpoint, filename, remote, mirror_board, function(load_result){

			d.resolve(load_result);
			logger.info("[DRIVER] --> "+ JSON.stringify(load_result));
		      
		    });
		    
		});
		
	  }else{
	    
		logger.debug("[DRIVER] ----> folder "+mountpoint+" EXISTS!");
		LoadDriver(driver_name, mountpoint, filename, remote, mirror_board, function(load_result){
		    
		    d.resolve(load_result);
		    logger.info("[DRIVER] --> "+ load_result.message);
		  
		});
	  }
	  
    } catch (err) {
	rest_response.message = "Error during driver folder creation: " + err;
	rest_response.result = "ERROR";
	logger.error("[DRIVER] --> "+JSON.stringify(rest_response));
	d.resolve(rest_response);
    }
  
    return d.promise;

}

//This function unmounts a driver
exports.unmountDriver = function (args){
    
    //Parsing the input arguments
    var driver_name = String(args[0])
    var result = "None"

    var rest_response = {};
    
    var mountpoint = '../drivers/'+driver_name;
    
    logger.info("[DRIVER] - Driver '"+driver_name+"' UNMOUNTING...");
    
    var d = Q.defer();
    
    try{
      
	logger.debug("[DRIVER] --> Driver "+driver_name+" configuration loading...");
	var driver_path = "./drivers/"+driver_name;
	var driver_conf = driver_path+"/"+driver_name+".json";
	var driverJSON = JSON.parse(fs.readFileSync(driver_conf, 'utf8'));
	var children = driverJSON.children;
	
	logger.debug('[DRIVER] --> JSON file '+ driver_name +'.json successfully parsed!');

	fuse.unmount(mountpoint, function (err) {
	  
	      if(err === undefined){
		  
		  var driver_mp_node = mp_list[driver_name]; 

		  if (driver_mp_node != null){
			
			
			// Unregistering RPCs for each file
			children.forEach(function(file, idx, list) {
			  
			    //logger.debug("Unregistering ("+file.name+") read_function: " + JSON.stringify(driver_mp_node['/'+file.name].read_function));
			  
			    if ( driver_mp_node['/'+file.name] != undefined) {
			      
				  session_drivers.unregister(driver_mp_node['/'+file.name].reg_read_function).then(
				    
				      function () {
					  // successfully unregistered
					  logger.debug("[DRIVER] --> RPC read function of "+file.name +" unregistered!");
					
				      },
				      function (error) {
					  // unregister failed
					  logger.error("[DRIVER] --> Error unregistering RPC read function of "+file);
				      }
				    
				  );

				  session_drivers.unregister(driver_mp_node['/'+file.name].reg_write_function).then(
				    
				      function () {
					  // successfully unregistered
					  logger.debug("[DRIVER] --> RPC write function of "+file.name +" unregistered!");
					
				      },
				      function (error) {
					  // unregister failed
					  logger.error("[DRIVER] --> Error unregistering RPC write function of "+file);
				      }
				    
				  );
				 
			    }
			    else{
			      logger.debug("I have not unregistered RPC file ("+file.name+") functions!");
			    }
			   
			    
			    if (idx === list.length - 1){ 
			      
			      try{
				    //logger.debug("...all files analyzed...");
				
				    //DATA cleaning------------------------------------------------------------------
				    logger.debug("[DRIVER] --> Driver "+driver_name+" garbage cleaning...");
				    
				    file_list[driver_name]=null;
				    delete file_list[driver_name];
				    logger.debug("[DRIVER] --> Files removed from list!" )
				    
				    mp_list[driver_name]=null;
				    delete mp_list[driver_name];	      
				    logger.debug("[DRIVER] --> Mountpoints of "+driver_name+" removed!")
				    //-------------------------------------------------------------------------------
	
				    rest_response.message = "Driver '"+driver_name+"' successfully unmounted!";
				    rest_response.result = "SUCCESS";
				    logger.info("[DRIVER] --> "+JSON.stringify(rest_response.message));
				    d.resolve(rest_response);
			      }
			      catch(err){
				  logger.error('[DRIVER] --> ERROR data cleaning "'+driver_name+'" during unmounting: '+err);
			      } 	      
		    
			    }

			    
			});
			
		  }
		  else{
		    
			try{
			      //DATA cleaning------------------------------------------------------------------
			      logger.debug("[DRIVER] --> Driver "+driver_name+" garbage cleaning...");
			      file_list[driver_name]=null;
			      delete file_list[driver_name];
			      logger.debug("[DRIVER] --> Files removed from list!" )
			      
			      mp_list[driver_name]=null;
			      delete mp_list[driver_name];	      
			      logger.debug("[DRIVER] --> Mountpoints of "+driver_name+" removed!")
			      //-------------------------------------------------------------------------------
			}
			catch(err){
			    logger.error('[DRIVER] --> ERROR data cleaning "'+driver_name+'" during unmounting: '+err);
			} 
			
			rest_response.message = "Driver '"+driver_name+"' successfully unmounted!";
			rest_response.result = "SUCCESS";
			logger.info("[DRIVER] --> "+JSON.stringify(rest_response.message));
			d.resolve(rest_response);
					  
		    
		  }

		  
		  

	      
	
	      }else{
		
		  rest_response.message = "ERROR during '"+driver_name+"' (fuse) unmounting: " +err;
		  rest_response.result = "ERROR";
		  logger.error("[DRIVER] --> "+JSON.stringify(rest_response.message));
		  d.resolve(rest_response);

	      }
	  
	});	
	
	
      
    }
    catch(err){
	logger.error('Error during driver configuration loading: '+err);
    }  
    
    

    
    return d.promise;

}






//This function injects a driver
exports.injectDriver = function (args){

    // Parsing the input arguments
    var driver_name = String(args[0]);
    var driver_code = String(args[1]);
    var driver_schema = String(args[2]);
    var autostart = String(args[3]);  // The autostart parameter is used to set the boot execution configuration of the driver.
    

    var d = Q.defer();
    
    var rpc_result = "";
    
    
    // Writing the driver's files (code and json schema)
    var driver_folder = './drivers/'+driver_name;
    var driver_file_name = driver_folder+'/' + driver_name + '.js';  
    var driver_schema_name = driver_folder+'/' + driver_name + '.json'; 
    
    // Check driver folder
    if ( fs.existsSync(driver_folder) === false ){
      
	logger.info("[DRIVER] - Called RPC injectDriver with driver_name = " + driver_name + ", autostart = " + autostart + ", driver_code = " + driver_code + ", driver_schema = " + driver_schema);
      
	// driver folder creation
	fs.mkdir(driver_folder, function() {
	  
	    // driver file creation
	    fs.writeFile(driver_file_name, driver_code, function(err) {
	      
		if(err) {
		  
		    rpc_result = 'Error writing '+ driver_file_name +' file: ' + err;
		    logger.error("[DRIVER] --> " + rpc_result);
		    
		    d.resolve(rpc_result);
		    
		} else {
		  
		  
		  // driver schema file creation
		  fs.writeFile(driver_schema_name, driver_schema, function(err) {
	      
		      if(err) {
			
			  rpc_result = 'Error writing '+ driver_schema +' file: ' + err;
			  logger.error("[DRIVER] --> " + rpc_result);
			  
			  d.resolve(rpc_result);
			  //return rpc_result;
			  
		      } else {
			
			
			  rpc_result = "Driver " + driver_name + " successfully injected!"
			  logger.info("[DRIVER] --> " + rpc_result);
			  
			  d.resolve(rpc_result);
			  
		      }
		  });      
		  
		    
		}
	    });      

	  
	});
    
    } else{
      
	rpc_result = "ERROR: "+driver_name+" driver's files already injected! - Remove the previous driver installation!";
	logger.warn("[DRIVER] --> " + rpc_result);
	
	d.resolve(rpc_result);      
      
    }

    
    return d.promise;
    
   

}



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




exports.removeDriver = function(args){
  
    // Parsing the input arguments
    driver_name = String(args[0]);

    logger.info("[DRIVER] - Remove driver RPC called for " + driver_name +"...");
    
    var d = Q.defer();
    var rpc_result = "";
    var driver_folder = './drivers/'+driver_name;

    // Check driver folder
    if ( fs.existsSync(driver_folder) === true ){
      
	rpc_result = "Driver " + driver_name + " successfully removed!"
	logger.info("[DRIVER] --> " + rpc_result);
	
	deleteFolderRecursive(driver_folder);
	
	d.resolve(rpc_result);
	
    
    } else{
      
	rpc_result = "WARNING - Folder of "+driver_name+" driver not found or already deleted!";
	logger.warn("[DRIVER] --> " + rpc_result);
	
	d.resolve(rpc_result);      
      
    }
    
    return d.promise;
    
}




//This function mounts all enabled drivers after a crash of Lightning-rod or a reboot of the board.
exports.mountAllEnabledDrivers = function (){
}

//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportDriverCommands = function (session){
    

    session_drivers = session;
     
    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+boardCode+'.driver.mountDriver', exports.mountDriver);
    session.register('s4t.'+boardCode+'.driver.unmountDriver', exports.unmountDriver); 
    session.register('s4t.'+boardCode+'.driver.injectDriver', exports.injectDriver);
    session.register('s4t.'+boardCode+'.driver.removeDriver', exports.removeDriver);
    
    /*
    session.register(boardCode+'.command.rpc.mountAllEnabledDrivers', exports.mountAllEnabledDrivers);
    */
    
    logger.info('[WAMP-EXPORTS] Driver commands exported to the cloud!');

    
}

