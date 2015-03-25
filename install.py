import shutil
import sys
import os

def main(argv):
	if len(argv) == 2:
		if(argv[1] == 'yun'):
			try:
				shutil.copyfile('./s4t-wamp-client_yun.js', '/opt/node-lighthing-rod/s4t-wamp-client_yun.js')
				shutil.copytree('./lib/', '/opt/node-lighthing-rod/')
				shutil.copyfile('./nlr-service', '/etc/init.d/nlr-service')
				os.system("ln -s /etc/init.d/nlr-service /etc/rc.d/S99node-lighthing-rod")

				print 'Node lighthing rod service is installed, now it will start every reboot'
				print 'You can start now the service whit the command "/etc/ini.d/nlr-service start"'
				
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