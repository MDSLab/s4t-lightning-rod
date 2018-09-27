#!/bin/ash

echo "Option chosen: "$1 $2


if [ "$1" = "backup" ]; then
        if [ "$#" -ne 1 ]; then
                echo "You have to specify:  'restore' <BACKUP_FILE> "
                exit
        fi
    	# BACKUP
    	echo "Backing up Iotronic configuration"
    	now_date=`date '+%Y%m%d%H%M%S'`
    	#board=`hostname`
    	board=`cat /var/lib/iotronic/settings.json | grep label | awk '{print $2}' | tr -d \" | tr -d ,`
    	bkp_filename="bkp_"$board"_"$now_date".tar.gz"
    	echo "-> backup filename: " $bkp_filename
    	tar zcvf $bkp_filename /var/lib/iotronic /etc/iotronic > /dev/null

elif [ "$1" = "restore" ]; then
	if [ "$#" -ne 2 ]; then
    		echo "You have to specify:  'restore' <BACKUP_FILE> "
    		exit
	fi
	# RESTORE
	echo "Restoring Iotronic configuration"
	tar -xvzf $2 -C /

else
        echo "You have to specify:"
        echo " - for backup:  'backup'"
        echo " - for restore: 'restore' <backup-filename-to-restore>"
        exit
fi
