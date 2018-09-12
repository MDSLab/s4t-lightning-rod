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
var logger = log4js.getLogger('manage-FS-libs');
logger.setLevel(loglevel);

var fs = require('fs');
var fsAccess = require('fs-access');
var mknod = require('mknod');
var util = require('util');
var statvfs = require('statvfs'); //This can be used for the statfs but I did not manage to install it on my system with NPM
var Q = require("q");



var session_fs = null;
var boardCode = nconf.get('config:board:code');

function path_translate(path_o, path){

	if (path === '/') {
		var rel_path = path_o;
		//logger.debug("real_path: " + rel_path)
	}
	else{
		var path = path.replace('/','');
		var rel_path = path_o.toString() + path.toString();
		//logger.debug("real_path: " + rel_path)
	}

	return rel_path

}


exports.utimes_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var atime = args[2];
	var mtime = args[3];

	logger.debug('[FS] - utimens(%s)',path);

	fs.utimes(path_translate(path_o, path), atime, mtime,
		function(err){
			if(err){
				logger.error('[FS] --> error: ', err);
				d.reject(err);
			}
			else {
				d.resolve(0);
			}
		}

	);

	return d.promise;

};


exports.access_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	//var mode = fs.F_OK; //args[2];

	//logger.debug('[FS] - access(path: %s - mode: %s)',path, mode);
	logger.debug('[FS] - access(path: %s)',path);

	try {
			//fs.access(path_translate(path_o, path), mode,
			fsAccess(path_translate(path_o, path),
				function(err){

						if(err){
							logger.error('[FS] --> access error: ', err);
							d.reject(err);
						}
						else {
							//logger.debug('[FS] --> access result: 0');
							d.resolve(0);
							//d.resolve([0,mode]);
						}



				}
			);
	} catch (e) {
		logger.error('[FS] --> access system error: ', e);
		d.reject(e);
	}



	return d.promise;

};


exports.mknod_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var mode = args[2];
	var dev = args[3];

	logger.debug('[FS] - mknod(%s)',path);

	mknod(path_translate(path_o, path), mode, dev,     //(not available in fs, using mknod module instead
		function(err){
			if(err){
				logger.error('[FS] --> error: ', err);
				d.reject(err);
			}
			else {
				d.resolve(0);
			}
		}
		
	);

	return d.promise;

};


exports.getxattr_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var name = args[2];
	var buffer = args[3];
	var length = args[4];
	var offset = args[5];

	logger.debug('[FS] - getxattr(%s)',path);


	fs.lstat(path_translate(path_o, path),
		function(err, stats){
			if(err){
				logger.error('[FS] --> error: ', err);
				d.resolve(err);
			}
			else {
				d.resolve([stats, name, buffer, length, offset]);
			}
		}
	);


	return d.promise;

};


exports.getattr_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];

	logger.debug('[FS] - getattr(%s)',path);

	try{


			fs.lstat( path_translate(path_o, path), function(err, stats){

					if(err){
						logger.error('[FS] --> getattr_function error: ', err);
						d.resolve(err);
					}
					else {

						d.resolve(stats);

						//logger.error(typeof stats );
						//logger.error(Object.getPrototypeOf(stats));


					}

			});



		
	} catch (e) {
		logger.error('[FS] --> getattr_function system error: ', e);
		d.reject(e);
	}


	//d.resolve(JSON.parse(JSON.stringify(fs.statSync(path_translate(path_o, path)))));

	return d.promise;

};


exports.readdir_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];

	logger.debug('[FS] - readdir(%s)', path);

	fs.readdir(path_translate(path_o, path), function(err, files){
		if(err){
			logger.error('[FS] --> error: ', err);
			d.reject(err);
		}
		else{
			logger.debug('[FS] --> files: ', files);
			d.resolve(files);
		}
	});

	return d.promise;

};


exports.open_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var flags = args[2];

	logger.debug('[FS] - open(%s)', path);

	fs.open(path_translate(path_o, path), flags, function (err, fd) {
		if(err){
			logger.error('[FS] --> error: ', err);
			d.resolve(err);
		}
		else{
			d.resolve(fd);
		}
	});

	return d.promise;

};


exports.read_function = function(args){

	//console.time("REST");
	
	var d = Q.defer();
	
	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var fd = args[2];
	var length = args[3];
	var position = args[4];

	var buffer = new Buffer(args[3]);
	
	logger.debug('[FS] - read(%s, %d, %d, %d)', path, fd, length, position);
	

	fs.open(path_translate(path_o, path), 'r', function (err, int_fd) {

		if(err){
			logger.error('[FS] --> read_function error: ', err);
			d.reject(err);
		}
		else{

			try {

				fs.read(int_fd, buffer, 0, length, position, function (err, bytesRead, int_buffer) {
					if (err) {
						logger.error('[FS] --> read_function error: ', err);
						d.reject(err);
					}
					else {
						
						fs.close(int_fd, function (err) {
							if (err) {
								logger.error('[FS] --> read_function error: ', err);
								d.reject(err);
							}
							else {

								//console.log(int_buffer.toString('base64'));

								//console.timeEnd("REST");

								d.resolve([int_buffer.toString('base64'), bytesRead]);
								
							}

						});
			
					}
				});

			} catch (err) {

				logger.error("[FS] - read_function failed: "+err);
				d.reject(err);
			}

		}
	});

	return d.promise;

};
	

exports.write_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var fd = args[2];
	var buffer = args[3];
	var length = args[4];
	var position = args[5];


	logger.debug('[FS] - write(%s, %d, %d, %d)', path, fd, length, position);


	fs.open(path_translate(path_o, path), 'r+', function (err, int_fd) {

		if(err){
			logger.error('[FS] --> write_function error: ', err);
			d.reject(err);
		}
		else{

			try {


				fs.write(int_fd, buffer, position, null, function (err, written, string) {
					if (err) {
						logger.error('[FS] --> write_function error: ', err);
						d.reject(err);
					}
					else {

						fs.close(int_fd, function (err) {
							if (err) {
								logger.error('[FS] --> write_function error: ', err);
								d.reject(err);
							}
							else {
								d.resolve(written);
							}

						});

					}
				});

			} catch (err) {

				logger.error("[FS] - write_function failed: "+err);
				d.reject(err);
			}

		}
	});

	return d.promise;

};


exports.truncate_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var size = args[2];

	logger.debug('[FS] - truncate(%s)',path);

	fs.truncate(path_translate(path_o, path), size,
		function(err){
			if(err){
				logger.error('[FS] --> truncate error: ', err);
				d.reject(err);
			}
			else {
				d.resolve(0);
			}
		}
	);

	return d.promise;

};


exports.readlink_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var options = args[2];
	
	logger.debug('[FS] - readlink(%s)', path);

	fs.readlink(path_translate(path_o, path), //options,
		function(err, linkString){
			if(err){
				logger.error('[FS] --> readlink error: ', err);
				d.reject(err);
			}
			else {
				d.resolve(linkString);
			}
		}
	);

	return d.promise;

};


exports.mkdir_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var mode = args[2];

	logger.debug('[FS] - mkdir(%s)', path);

	fs.mkdir(path_translate(path_o, path), mode, function (err) {
		if(err){
			logger.error('[FS] --> mkdir error: ', err);
			d.reject(err);
		}
		else{
			d.resolve([0,mode]);
		}
	});

	return d.promise;

};


exports.rmdir_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];

	logger.debug('[FS] - rmdir(%s)', path);

	fs.rmdir(path_translate(path_o, path), function (err) {
		if(err){
			logger.error('[FS] --> rmdir error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};


exports.statfs_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];

	logger.debug('[FS] - statvfs(%s)', path);

	statvfs(path_translate(path_o, path), function(err, stats){
		if(err){
			logger.error('[FS] --> statvfs error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(stats);
		}
	});

	return d.promise;

};


exports.unlink_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];

	logger.debug('[FS] - unlink(%s)', path);

	fs.unlink(path_translate(path_o, path), function(err){
		if(err){
			logger.error('[FS] --> unlink error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};


exports.link_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var src = args[1];
	var dest = args[2];

	logger.debug('[FS] - link(%s,%s)', src, dest);

	fs.link(path_translate(path_o, src), path_translate(path_o, dest), function (err) {
		if(err){
			logger.error('[FS] --> link error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};


exports.symlink_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var src = args[1];
	var dest = args[2];

	logger.debug('[FS] - symlink(%s,%s)', src, dest);

	fs.symlink(path_translate(path_o, src), path_translate(path_o, dest), function (err) {
		if(err){
			logger.error('[FS] --> symlink error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};


exports.rename_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var src = args[1];
	var dest = args[2];

	logger.debug('[FS] - rename(%s,%s)', src, dest);

	fs.rename(path_translate(path_o, src), path_translate(path_o, dest), function (err) {
		if(err){
			logger.error('[FS] --> rename error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};


exports.chown_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var uid = args[2];
	var gid = args[3];

	logger.debug('[FS] - chown(%s)', path);

	fs.chown(path_translate(path_o, path), uid, gid, function (err) {
		if(err){
			logger.error('[FS] --> chown error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};


exports.chmod_function = function(args){

	var d = Q.defer();

	//Parsing the input arguments
	var path_o = args[0];
	var path = args[1];
	var mode = args[2];

	logger.debug('[FS] - chmod(%s)', path);

	fs.chmod(path_translate(path_o, path), mode, function (err) {
		if(err){
			logger.error('[FS] --> chown error: ', err);
			d.reject(err);
		}
		else{
			d.resolve(0);
		}
	});

	return d.promise;

};






//This function exports all the functions in the module as WAMP remote procedure calls
exports.exportFSLibs = function (session){
    
    session_fs = session;
	
	//Register FS functions as WAMP RPCs
	session_fs.register('s4t.'+boardCode+'.fs.getattr_function', exports.getattr_function);
	session_fs.register('s4t.'+boardCode+'.fs.getxattr_function', exports.getxattr_function);
	session_fs.register('s4t.'+boardCode+'.fs.readdir_function', exports.readdir_function);
	session_fs.register('s4t.'+boardCode+'.fs.open_function', exports.open_function);
	session_fs.register('s4t.'+boardCode+'.fs.read_function', exports.read_function);
	session_fs.register('s4t.'+boardCode+'.fs.write_function', exports.write_function);
	session_fs.register('s4t.'+boardCode+'.fs.truncate_function', exports.truncate_function);
	session_fs.register('s4t.'+boardCode+'.fs.mknod_function', exports.mknod_function);
	session_fs.register('s4t.'+boardCode+'.fs.access_function', exports.access_function);
	session_fs.register('s4t.'+boardCode+'.fs.utimes_function', exports.utimes_function);
	session_fs.register('s4t.'+boardCode+'.fs.readlink_function', exports.readlink_function);
	session_fs.register('s4t.'+boardCode+'.fs.mkdir_function', exports.mkdir_function);
	session_fs.register('s4t.'+boardCode+'.fs.rmdir_function', exports.rmdir_function);
	session_fs.register('s4t.'+boardCode+'.fs.statfs_function', exports.statfs_function);
	session_fs.register('s4t.'+boardCode+'.fs.link_function', exports.link_function);
	session_fs.register('s4t.'+boardCode+'.fs.unlink_function', exports.unlink_function);
	session_fs.register('s4t.'+boardCode+'.fs.symlink_function', exports.symlink_function);
	session_fs.register('s4t.'+boardCode+'.fs.rename_function', exports.rename_function);
	session_fs.register('s4t.'+boardCode+'.fs.chown_function', exports.chown_function);
	session_fs.register('s4t.'+boardCode+'.fs.chmod_function', exports.chmod_function);

    logger.info('[WAMP-EXPORTS] FS-LIBS exported to the cloud!');

    
};

