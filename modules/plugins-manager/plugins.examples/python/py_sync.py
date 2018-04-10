# User imports
import sys
import time
import threading
import os
from datetime import datetime
import Queue


class Plugin(threading.Thread):
    def __init__(self, params, q_result):
        threading.Thread.__init__(self)
        # self.setDaemon(1)
        self.setName("SyncPlugin")  # Set thread name
        self.params = params
        self.q_result = q_result

    def run(self):
        print("Plugin Thread starting...")
        print("--> PARAMS: " + self.params)



        now = datetime.now().strftime( "%-d %b %Y %H:%M:%S.%f" )
        self.q_result.put({"time":now})

        """
        i = 0
        while(True):

            if i < 2:
                now = datetime.now().strftime( "%-d %b %Y %H:%M:%S.%f" )
                print("I'm "+self.params + " @ "+now)
                i=i+1
                time.sleep(1)
            else:
                self.q_result.put({"time":now})
                time.sleep(1)
                os.kill(os.getpid(),9)

        """

