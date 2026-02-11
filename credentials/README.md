# Credentials Folder

## The purpose of this folder is to store all credentials needed to log into your server and databases. This is important for many reasons. But the two most important reasons is
    1. Grading , servers and databases will be logged into to check code and functionality of application. Not changes will be unless directed and coordinated with the team.
    2. Help. If a class TA or class CTO needs to help a team with an issue, this folder will help facilitate this giving the TA or CTO all needed info AND instructions for logging into your team's server. 


# Below is a list of items required. Missing items will causes points to be deducted from multiple milestone submissions.

1. Server URL or IP
    <br> Server IP: 34.53.13.204
2. SSH username
    <br> deploy
3. SSH password or key.
    <br> If a ssh key is used please upload the key to the credentials folder.
    <br> Uploaded to the credentials folder.
    <br> If asked for a password, password is: bruh
4. Database URL or IP and port used.
    <br>DB host: 127.0.0.1
        DB port: 3306
        Access method: SSH tunnel through the server, MySQL is not publicly exposed.
5. Database username
    <br>App user team1_user
        Admin user class_cto
6. Database password
    <br> team1_user password Swesp26!2026  
         class_cto password Swesp26!2026
7. Database name (basically the name that contains all your tables)
    <br> team1_db
8.Application URL (Live Website)
    <br> http://34.53.13.204
9. GitHub Repository
    <br> https://github.com/CSC-648-SFSU/CSC-648-848-S02-Spring2026-Team01

10. Instructions on how to use the above information.

## 8. Instructions

### A. SSH into the server

Use the SSH private key file that is stored in this folder.

1. Download these files from this credentials folder to your computer
   - team1_grader_ed25519
   - team1_grader_ed25519.pub

2. Set correct permissions on the private key file
   - Mac or Linux
     chmod 600 team1_grader_ed25519
   - Windows PowerShell
     icacls .\team1_grader_ed25519 /inheritance:r
     icacls .\team1_grader_ed25519 /grant:r "$env:USERNAME:(R)"

3. SSH command
   ssh -i team1_grader_ed25519 deploy@34.53.13.204
   If asked for password, it is : "bruh"

### B. SSH tunnel to MySQL (MySQL is not publicly exposed)

This forwards your local port 3306 to the server’s MySQL port 3306.

1. Create the tunnel (leave this running)
   ssh -i team1_grader_ed25519 -L 3306:127.0.0.1:3306 deploy@34.53.13.204

2. In a second terminal, connect to MySQL through the tunnel

App user
   mysql -h 127.0.0.1 -P 3306 -u team1_user -p team1_db

Admin user
   mysql -h 127.0.0.1 -P 3306 -u class_cto -p

### C. Verify the web app on the server

After SSH login

1. Check PM2
   pm2 status
   pm2 logs team1-app --lines 50

2. Test locally on the server
   curl http://127.0.0.1:3000/api/test
   curl http://127.0.0.1:3000/api/db-test

3. Test through Nginx
   curl -I http://127.0.0.1

4. Visit the live website
   http://34.53.13.204



# Most important things to Remember
## These values need to kept update to date throughout the semester. <br>
## <strong>Failure to do so will result it points be deducted from milestone submissions.</strong><br>
## You may store the most of the above in this README.md file. DO NOT Store the SSH key or any keys in this README.md file.
