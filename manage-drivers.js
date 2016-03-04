//service logging configuration: "manageDrivers"   
var logger = log4js.getLogger('manageDrivers');

var fs = require('fs');
var fuse = require('fuse-bindings')
var Q = require("q");



file_list = []
mp_list = {};
driver_name = ""
fd_index = 3 //fd index used by Unix as file descriptor: we can use this index starting from 3 

mode_lookup_table = {
  rw: 33188, 	//rw-r--r-- 100644
  r: 33060	//r--r--r-- 100444
}



var device0_file = '/sys/bus/iio/devices/iio:device0/enable';
//var mountpoint = '/opt/stack4things/drivers/temp_driver';
var driversConfPath = '/opt/stack4things/s4t-lightning-rod-master/drivers/temp_driver'

var readdir_function = function (mountpoint, cb) {
    logger.info('readdir(%s)', mountpoint)
    //if (mountpoint === '/') return cb(0, [driver_name]);
    //if (mountpoint === '/'+driver_name) return cb(0, file_list );
    if (mountpoint === '/') return cb(0, file_list );
    cb(0)
}

var getattr_function = function (mountpoint, cb) {
  
    logger.info('getattr(%s)', mountpoint)
    
    if(mp_list[mountpoint].mp != undefined){
      cb(0, mp_list[mountpoint].mp )
      return
    }
    
    cb(fuse.ENOENT)

}

var open_function = function (mountpoint, flags, cb) {
  
    fd_index = fd_index + 1
    
    logger.info('Open(%s, %d) - fd = %s', mountpoint, flags, fd_index);
    
    cb(0, fd_index) //cb(0, 42) // 42 is an fd
}


function readFunction(driver){
  
    var read_function = function (mountpoint, fd, buf, len, pos, cb) {
      
	  logger.info('Read(%s, %d, %d, %d)', mountpoint, fd, len, pos);

	  driver[mp_list[mountpoint].read_function]( function(read_content){
		var buffer = new Buffer(read_content.toString(), 'utf-8');
		var str = ''+buffer.slice(pos);
		if (!str)
		    return cb(0);     
		buf.write(str);
		return cb(str.length);
	  });      

	
    }  
    
    return read_function
    
}
 
function writeFunction(driver){
  
      var write_function = function (mountpoint, fd, buffer, length, position, cb) {
	
	    logger.info('Writing', buffer.slice(0, length));
	    content = buffer.slice(0, length);
	    logger.info("--> buffer content: " + content.toString());
	    logger.info("--> buffer length: " + length.toString());
      



	    if (mp_list[mountpoint].write_function === null){
	      
		cb(fuse.EACCES);
		
	    } else {
		driver[mp_list[mountpoint].write_function]( content, function(){
		    cb(length);
		});
	    }
	   
      } 
      
      return write_function
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




function LoadDriver(driver_name, mountpoint, callback){
  
    var driver_path = "./drivers/"+driver_name;
    var driver_conf = driver_path+"/"+driver_name+".json";
    var driver_module = driver_path+"/"+driver_name+".js";
    var driver = require(driver_module);
    
    logger.info("DRIVER LOADING: "+ driver_name);

    try{
      
	var driverJSON = JSON.parse(fs.readFileSync(driver_conf, 'utf8'));
	logger.info(driverJSON);
	logger.info('--> JSON file '+ driver_name +'.json successfully parsed!');
	
	driver_name = driverJSON.name; 
	logger.info("--> Driver name: " + driver_name)
	var type = driverJSON.type; //logger.info("\tfile type: " + type)
	var permissions = MaskConversion(driverJSON.permissions); //logger.info("\tpermissions: " + MaskConversion(permissions))
	//var root_permissions = MaskConversion(driverJSON.root_permissions);
	var children = driverJSON.children; //logger.info("Files in the folder:")


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
	mp_list[fuse_root_path]={
	    name: driver_name,
	    mp: {}
	}
	mp_list[fuse_root_path].mp=root_mp;
	mp_list[fuse_root_path].type = "folder";

	/*
	fuse_driver_path='/'+driver_name;		  
	var driver_mp ={ 
	    mtime: new Date(),
	    atime: new Date(),
	    ctime: new Date(),
	    size: 100,
	    mode: permissions,
	    uid: process.getuid(),
	    gid: process.getgid()
	}
	mp_list[fuse_driver_path]={
	    name:"driver",
	    mp: {}
	}
	mp_list[fuse_driver_path].mp=driver_mp;
	mp_list[fuse_driver_path].type = "folder";
	*/
	
	children.forEach(function(file) {
	  
	      //logger.info("\t"+file.name);
	  
	      file_list.push(file.name); // FOR readdir_function
	      
	      if(file.read_function != undefined){
		var read_function = file.read_function
	      }else{
		var read_function = null
	      }
	      
	      if(file.write_function != undefined){  
		var write_function = file.write_function
	      }else{
		var write_function = null
	      }
	      
	      //fuse_file_path='/'+driver_name+'/'+file.name;
	      fuse_file_path='/'+file.name;
	      var file_mp = { 

		  mtime: new Date(),
		  atime: new Date(),
		  ctime: new Date(),
		  size: 100,
		  mode: MaskConversion(file.permissions),
		  uid: process.getuid(),
		  gid: process.getgid()

	      }
	      mp_list[fuse_file_path]={
		name:"",
		read_function: read_function,
		write_function: write_function,
		mp: {}
	      }
	      mp_list[fuse_file_path].mp = file_mp;
	      mp_list[fuse_file_path].name = file.name
	      mp_list[fuse_file_path].type = "file";
	      mp_list[fuse_file_path].read_function = read_function
	      mp_list[fuse_file_path].write_function = write_function
	  
	});
	
	//logger.info("FILENAME LIST: " + file_list)
	logger.info("MP LIST: " + JSON.stringify(mp_list,null,"\t"))
	
	
	logger.info("DRIVER MOUNTING...");
	fs.writeFile(device0_file, '1', function(err) {
	  
	    if(err) {
		logger.error('Error writing device0 file: ' + err);
		
	    } else {
		logger.info("--> device0 successfully enabled!");
		
		fuse.mount(mountpoint, {
		  readdir: readdir_function,
		  getattr: getattr_function,
		  open: open_function,
		  read: readFunction(driver), //read_function,
		  write: writeFunction(driver) //write_function
		})
		
		//logger.info("--> DRIVER successfully mounted!");
		
		callback("driver '"+driver_name+"' successfully mounted!")
		
	    }
	    
	}); 
	

    }
    catch(err){
	logger.error('Error during driver loading: '+err);
    }  
  
}


//This function injects a driver
exports.injectDriver = function (args, details){
    
   

}

//This function mounts a driver
exports.mountDriver = function (args, details){
    
    //Parsing the input arguments
    var driver_name = String(args[0])
    var result = "None"
    var mountpoint = '../drivers/'+driver_name;
    
    var d = Q.defer();
    
    logger.info("DRIVER LOADING: "+ driver_name);
    logger.info("--> Driver folder ("+mountpoint+") checking...")
    
    try{
	  if ( fs.existsSync(mountpoint) === false ){
	    
		//Create the directory, call the callback.
		fs.mkdir(mountpoint, 0755, function() {

		    logger.info("----> folder "+mountpoint+" CREATED!");
		    LoadDriver(driver_name, mountpoint, function(load_result){
			
			d.resolve(load_result);
			logger.info("--> "+load_result);
		      
		    });
		    
		});
		
	  }else{
	    
		logger.info("----> folder "+mountpoint+" EXISTS!");
		LoadDriver(driver_name, mountpoint, function(load_result){
		    
		    d.resolve(load_result);
		    logger.info("--> "+load_result);
		  
		});
	  }
	  
    } catch (err) {
	result = "Error driver folder creation: " + err
	logger.error(result);
	d.resolve(result);
    }
  
    return d.promise;

}

//This function unmounts a driver
exports.unmountDriver = function (args, details){
    
    //Parsing the input arguments
    var driver_name = String(args[0])
    var result = "None"
    var mountpoint = '../drivers/'+driver_name;
    
    var d = Q.defer();
    
    logger.info("DRIVER '"+driver_name+"' UNMOUNTING...");
    
    fuse.unmount(mountpoint, function (err) {
      
	  if(err === undefined){
	      
	      result = "driver '"+driver_name+"' successfully unmounted!";
	      d.resolve(result);
	      logger.info("--> "+result);
	      
	  }else{
	      result = "ERROR during '"+driver_name+"' unmounting: " +err;
	      d.resolve(result);
	      logger.error("--> "+result);
	  }
      
    })   
    
    return d.promise;

}

//This function mounts all enabled drivers after a crash of Lightning-rod or a reboot of the board.
exports.mountAllEnabledDrivers = function (){
}

//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportDriverCommands = function (session){
    
    //Read the board code in the configuration file
    var boardCode = nconf.get('config:board:code');
    
    
    
    //Register all the module functions as WAMP RPCs
    session.register('s4t.'+boardCode+'.driver.mountDriver', exports.mountDriver);
    session.register('s4t.'+boardCode+'.driver.unmountDriver', exports.unmountDriver); 
    /*
    session.register(boardCode+'.command.rpc.injectDriver', exports.injectDriver);
    session.register(boardCode+'.command.rpc.mountAllEnabledDrivers', exports.mountAllEnabledDrivers);
    */
    
    logger.info('[WAMP-EXPORTS] Driver commands exported to the cloud!');

    
}

