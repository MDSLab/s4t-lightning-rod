#############################################################################################
###
## Copyright (C) 2018 Nicola Peditto
###
## Licensed under the Apache License, Version 2.0 (the "License");
## you may not use this file except in compliance with the License.
## You may obtain a copy of the License at
###
## http://www.apache.org/licenses/LICENSE-2.0
###
## Unless required by applicable law or agreed to in writing, software
## distributed under the License is distributed on an "AS IS" BASIS,
## WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
## See the License for the specific language governing permissions and
## limitations under the License.
###
#############################################################################################

import sys
import imp
import socket
from datetime import datetime
import time
import Queue
import os
import threading

# Inputs
plugin_name = sys.argv[1]
params = sys.argv[2]


# Globals
socket_path = '/tmp/plugin-'+plugin_name
plugin_path = os.environ.get('IOTRONIC_HOME')+"/plugins/"+plugin_name+"/"+plugin_name+".py"
plugin = imp.load_source("plugin", plugin_path)
q_result = Queue.Queue()


# Thread to run user's plugin logic
class Plugin(threading.Thread):

    def __init__(self, params, q_result):
        threading.Thread.__init__(self)
        # self.setDaemon(1)
        self.setName(plugin_name)  # Set thread name
        self.params = params
        self.q_result = q_result

    def run(self):
        result = plugin.main(self.params)
        self.q_result.put(result)


# WRAPPER MAIN
if __name__ == '__main__':

    worker = Plugin(
        params,
        q_result
    )

    # 1. thread plugin starting
    worker.start()

    # 2. waiting for plugin result injected in the queue
    while q_result.empty():
        pass

    result = q_result.get()

    msg = "Plugin " + plugin_name + " says: " + str(result)

    # connect to the unix local socket with a stream type
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.connect(socket_path)
    client.send(msg)
    client.close()
