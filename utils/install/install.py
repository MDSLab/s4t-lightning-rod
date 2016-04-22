#
#Apache License
#                           Version 2.0, January 2004
#                        http://www.apache.org/licenses/
#
#Copyright (c) 2014 2015 Andrea Rocco Lotronto
#

import shutil
import sys
import os

def main(argv):
	if len(argv) == 2:
		if(argv[1] == 'yun'):
			try:
				shutil.copytree('./', '/opt/node-lighthing-rod/')
				#os.system('mv /opt/node-lighthing-rod/node_modules_yun /opt/node-lighthing-rod/node_modules')
				shutil.copyfile('./s4t_initd_service', '/etc/init.d/s4t_stable')
				os.system('chmod +x /etc/init.d/s4t_stable')
				os.system('/etc/init.d/s4t_stable enable')

				print 'Node lighthing rod service is installed, now it will start every reboot'
				print 'You can start now the service whit the command "/etc/init.d/s4t_stable start"'
				
			except IOError as e:
				print('Error: %s' %e)

		elif(argv[1] == 'rasp'):
			print 'Board is YUN ?', argv[1]
			
		else:
			print 'Error Board type doesn\'t exist!!'
	else:
		print 'Error only one argument is needed!!'



if __name__ == '__main__':

	main(sys.argv)
