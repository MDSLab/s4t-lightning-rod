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


//service logging configuration: "manageFS"
var logger = log4js.getLogger('manageFS');
logger.setLevel(loglevel);

var fs = require('fs');
var fuse = require('fuse-bindings');
var Q = require("q");
var util = require('util');

var session_fs = null;
var boardCode = nconf.get('config:board:code');


var pt = require('path');


function path_translate(path_o, path){

	if (path === '/') {
		var rel_path = path_o;
		logger.debug("root real_path: " + rel_path)
	}
	else{
		var path = path.replace('/','');
		var rel_path = path_o.toString() + path.toString();
		logger.debug("real_path: " + rel_path)
	}

	return rel_path

}


//This function mounts a driver
exports.mountFS = function (args){

	//Parsing the input arguments: [mirrored_board, path_org, path_dest]
	var mirrored_board = String(args[0]);
	var path_org = String(args[1]);		//real path
	var path_dest = String(args[2]); 	//mirrored path

	d = Q.defer();

	logger.info("[FS] - MOUNTING FS from '"+mirrored_board+"'...");
	logger.debug("[FS] - "+mirrored_board+" --> Parameters:\n - path_org in "+mirrored_board+": "+path_org+"\n - path_dest in "+boardCode+": " + path_dest);

	var rest_response = {};

	try{

		fuse.mount(path_dest, {
			getattr: wrap_getattr_function(mirrored_board, path_org, "getattr_function"),
			readdir: wrap_readdir_function(mirrored_board, path_org, "readdir_function"),
			open: wrap_open_function(mirrored_board, path_org, "open_function"),
			read: wrap_read_function(mirrored_board, path_org, "read_function"),
			write: wrap_write_function(mirrored_board, path_org, "write_function"),
			getxattr: wrap_getxattr_function(mirrored_board, path_org, "getxattr_function"),
			truncate: wrap_truncate_function(mirrored_board, path_org, "truncate_function"),
			mknod: wrap_mknod_function(mirrored_board, path_org, "mknod_function"),
			access: wrap_access_function(mirrored_board, path_org, "access_function"),
			utimens: wrap_utimes_function(mirrored_board, path_org, "utimes_function"),
			readlink: wrap_readlink_function(mirrored_board, path_org, "readlink_function"),
			mkdir: wrap_mkdir_function(mirrored_board, path_org, "mkdir_function"),
			rmdir: wrap_rmdir_function(mirrored_board, path_org, "rmdir_function"),
			statfs: wrap_statfs_function(mirrored_board, path_org, "statfs_function"),
			link: wrap_link_function(mirrored_board, path_org, "link_function"),
			unlink: wrap_unlink_function(mirrored_board, path_org, "unlink_function"),
			symlink: wrap_symlink_function(mirrored_board, path_org, "symlink_function"),
			rename: wrap_rename_function(mirrored_board, path_org, "rename_function"),
			chown: wrap_chown_function(mirrored_board, path_org, "chown_function"),
			chmod: wrap_chmod_function(mirrored_board, path_org, "chmod_function")
			//setxattr: setxattr_function (not available in fs or other implementations)
			//listxattr: (not available in fuse-bindings)
			//removexattr: (not available in fuse-bindings)
		});

		rest_response.message = "Filesystem mounted";
		rest_response.result = "SUCCESS";
		logger.info("[FS] - "+mirrored_board+" --> "+rest_response.message);
		d.resolve(rest_response);


	} catch (err) {
		rest_response.message = "Error during filesystem mounting: " + err;
		rest_response.result = "ERROR";
		logger.error("[FS] - "+mirrored_board+" --> "+rest_response.message);
		d.reject(rest_response);
	}


	return d.promise;

};


//UMOUNT
exports.unmountFS = function (args){

	//Parsing the input arguments
	var path_dest = String(args[0]);

	var d = Q.defer();

	logger.info("[VFS] - UNMOUNTING FS '"+path_dest+"'...");

	var rest_response = {};

	try{

		fuse.unmount(path_dest, function (err) {

			if(err === undefined){

				rest_response.message = path_dest+"' successfully unmounted!";
				rest_response.result = "SUCCESS";
				logger.info("[VFS] --> "+rest_response.message);
				d.resolve(rest_response);

			}else{

				rest_response.message = "FUSE ERROR during unmounting '"+path_dest+"': " + err;
				rest_response.result = "ERROR";
				logger.error("[VFS] --> "+rest_response.message);
				d.resolve(rest_response);

			}

		});


	}
	catch(err){
		rest_response.message = "ERROR during unmounting '"+path_dest+"': " +err;
		rest_response.result = "ERROR";
		logger.error("[VFS] - "+path_dest+" --> "+ rest_response.message);
		d.resolve(rest_response);
	}

	return d.promise;

};









function wrap_chmod_function(mirrored_board, path_org, fs_function){

	return function (path, mode, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, mode] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);


			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_chown_function(mirrored_board, path_org, fs_function){

	return function (path, uid, gid, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, uid, gid] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);


			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_rename_function(mirrored_board, path_org, fs_function){

	return function (src, dest, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, src, dest] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);


			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_symlink_function(mirrored_board, path_org, fs_function){

	return function (src, dest, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, src, dest] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);


			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_link_function(mirrored_board, path_org, fs_function){

	return function (src, dest, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, src, dest] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);


			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_unlink_function(mirrored_board, path_org, fs_function){

	return function (path, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_statfs_function(mirrored_board, path_org, fs_function){

	return function (path, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(null, result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_rmdir_function(mirrored_board, path_org, fs_function){

	return function (path, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_mkdir_function(mirrored_board, path_org, fs_function){

	return function (path, mode, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, mode] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				mode = result[1];
				cb(result[0]);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_readlink_function(mirrored_board, path_org, fs_function){

	return function (path, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		var options = null;

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, options] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(null,result); // result == linkString

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_utimes_function(mirrored_board, path_org, fs_function){

	return function (path, atime, mtime, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, atime, mtime] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_access_function(mirrored_board, path_org, fs_function){

	return function (path, mode, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, mode] ).then(

			function(result){

				//logger.warn("[FS] - Response "+fs_function+": "+mode);
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_mknod_function(mirrored_board, path_org, fs_function){

	return function (path, mode, dev, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, mode, dev] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_truncate_function(mirrored_board, path_org, fs_function){

	return function (path, size, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, size] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_getattr_function(mirrored_board, path_org, fs_function){

	return function (path, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		try {
			
			session_fs.call('s4t.' + mirrored_board + '.fs.' + fs_function, [path_org, path]).then(
				function (result) {

					//logger.warn("[FS] - Response " + fs_function + ": " + JSON.stringify(result, null, '\t'));

					//logger.warn(typeof result);
					//logger.warn(Object.getPrototypeOf(result));

					result['atime'] = new Date(result['atime']);
					result['mtime'] = new Date(result['mtime']);
					result['ctime'] = new Date(result['ctime']);

					//logger.warn(result);

					if (result.errno != undefined) //if (result.code==="ENOENT")
						cb(fuse[result.code]);
					else
						cb(0, result);
					


				}
				,
				function (error) {

					logger.error("[FS] - Response " + fs_function + " error: " + JSON.stringify(error));
					cb(fuse[error.code]);

				}
			);

		}catch (e) {

			logger.error('[FS] --> getattr_function system error: ', e);

		}



	};


}


function wrap_getxattr_function(mirrored_board, path_org, fs_function){
	
	return function (path, name, buffer, length, offset, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		try {

				session_fs.call('s4t.' + mirrored_board + '.fs.' + fs_function, [path_org, path, name, buffer.toString(), length, offset]).then(

					function (result) {

						//logger.warn("[FS] - Response " + fs_function + ": " + JSON.stringify(result, null, '\t'));

						var stats = result[0];
						name = result[1];
						buffer.write(result[2]);//result[2];
						length = result[3];
						offset = result[4];


						stats['atime'] = new Date(stats['atime']);
						stats['mtime'] = new Date(stats['mtime']);
						stats['ctime'] = new Date(stats['ctime']);
						

						cb(0, stats);
						


					},
					function (error) {

						logger.error("[FS] - Response " + fs_function + " error: " + JSON.stringify(error));
						cb(fuse[error.code]);

					}

				);

		}catch (e) {

			logger.error('[FS] --> getattr_function system error: ', e);

		}





	};


}


function wrap_readdir_function(mirrored_board, path_org, fs_function){

	return function (path, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+": "+JSON.stringify(result));
				cb(null, result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_open_function(mirrored_board, path_org, fs_function){

        return function (path, flags, cb) {

                //logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

                session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, flags] ).then(

                        function (result) {

                                //logger.debug("[FS] - Response "+fs_function+": "+JSON.stringify(result));

                                cb(null, result);

                        },
                        function(error){

                                  if ( error.args[0].code ==="EINVAL"){
                                    logger.warn("[FS] - Response "+fs_function+" warning: "+ JSON.stringify(error));
                                    cb(fuse[error.code]);
                                  }else{
                                    logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
                                    cb(fuse[error.code]);
                                  }




                        }


                );

        };


}



function wrap_read_function(mirrored_board, path_org, fs_function){

	return function (path, fd, buffer, length, position, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);

		//console.time("CALL");
		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, fd, length, position] ).then(

			function (result) {

				//console.timeEnd("CALL");

				//logger.warn("[FS] - Response "+fs_function+" from "+mirrored_board+": "+ path);//+JSON.stringify(result[0].toString()));
				
				mybuff = new Buffer(result[0], 'base64');
				//console.log(mybuff.toString('base64'));
				mybuff.copy(buffer);



				cb(result[1]);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}


function wrap_write_function(mirrored_board, path_org, fs_function){

	return function (path, fd, buffer, length, position, cb) {

		//logger.debug('[FS] - CALLED RPC: '+'s4t.'+mirrored_board+'.fs.'+fs_function  +" call file --> " + path + " in "+path_org);
		
		session_fs.call('s4t.'+mirrored_board+'.fs.'+fs_function, [path_org, path, fd, buffer.toString(), length, position] ).then(

			function (result) {

				//logger.warn("[FS] - Response "+fs_function+" from "+mirrored_board+": "+ path);//+JSON.stringify(result[0].toString()));
				
				cb(result);

			},
			function(error){

				logger.error("[FS] - Response "+fs_function+" error: "+ JSON.stringify(error));
				cb(fuse[error.code]);

			}


		);

	};


}




//This function exports all the functions in the module as WAMP remote procedure calls
exports.Init = function (session){
    
    session_fs = session;
     
    //Register all the module functions as WAMP RPCs
	session_fs.register('s4t.'+boardCode+'.fs.mountFS', exports.mountFS);
    session_fs.register('s4t.'+boardCode+'.fs.unmountFS', exports.unmountFS);

    
    logger.info('[WAMP-EXPORTS] FS-FUSE commands exported to the cloud!');

    
};



//This function executes procedures at boot time (no Iotronic dependent)
exports.Boot = function (){

	logger.info('[BOOT] - VFS Manager booting procedures not defined.');

};