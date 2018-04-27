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
import os
import json
import threading
import Queue

# Inputs
plugin_name = sys.argv[1]
plugin_params = sys.argv[2]


# Globals
socket_path = '/tmp/plugin-'+plugin_name
plugin_path = os.environ.get('IOTRONIC_HOME')+"/plugins/"+plugin_name+"/"+plugin_name+".py"
plugin = imp.load_source("plugin", plugin_path)
q_result = Queue.Queue()


# Thread to run user's plugin logic
class Plugin(threading.Thread):

    def __init__(self, params, q_result):

        threading.Thread.__init__(self)
        self.setName(plugin_name)
        self.params = json.loads(params)
        self.q_result = q_result

    def run(self):

        try:

            print("Plugin Thread starting...")
            print("--> PARAMS:" + str(self.params))

            result = "Plugin " +plugin_name+" is running!"

            response = {
                    "message": str(result),
                    "result": "SUCCESS"
            }

            self.q_result.put(json.dumps(response))

            plugin.main(self.params)


        except Exception as err:
            response = {
                    "message": str(err),
                    "result": "ERROR"
            }

            self.q_result.put(json.dumps(response))





# WRAPPER MAIN
if __name__ == '__main__':

    worker = Plugin(
        plugin_params,
        q_result
    )

    # 1. thread plugin starting
    worker.start()

    # 2. waiting for plugin result injected in the queue
    while q_result.empty():
        pass

    # 3. Get data from plugin queue and parsing
    data = q_result.get()
    data_parsed = json.loads(data)

    # 4. Create package for Plugin Manager
    msg = json.dumps({
        "plugin": plugin_name,
        "payload": str(data_parsed["message"]),
        "result": str(data_parsed["result"])
    })

    # 5. Connect to the unix local socket to send the plugin package
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.connect(socket_path)
    client.send(msg)
    client.close()