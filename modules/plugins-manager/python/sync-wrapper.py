import sys
import imp
import socket
from datetime import datetime
import time
import Queue
import os

plugin_name = sys.argv[1]
params = sys.argv[2]

socket_path = '/tmp/plugin-'+plugin_name

plugin_path = os.environ.get('IOTRONIC_HOME')+"/plugins/"+plugin_name+"/"+plugin_name+".py"

plugin = imp.load_source("plugin", plugin_path)

q_result = Queue.Queue()

worker = plugin.Plugin(
    params,
    q_result
)


worker.start()

while q_result.empty():
    pass

result = q_result.get()

"""

result = plugin.main(plugin_name)

"""

# print("RESULT -> "+str(result["time"]))

msg="Plugin " + plugin_name + " says: " + str(result["time"])

# connect to the unix local socket with a stream type
client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
client.connect(socket_path)
client.send(msg)
client.close()
