# Backend work for Milestone 0 (Task 3)

## Server Details
- Platform: Google Compute Engine
- Operating System: Ubuntu 22.04 LTS

## Steps

1. Created a Google Compute Engine VM with Ubuntu 22.04 LTS.
2. Generated SSH key pair and added public key to VM.
3. Connected to the VM using SSH.
4. Updated system packages using apt.
5. Installed Node.js (20.x LTS) and npm.
6. Created backend project directory at /var/www/team1-app.
7. Initialized npm project using npm init.
8. Installed backend dependencies (express, mysql2, dotenv).
9. Created server.js with an Express backend.
10. Implemented API routes:
    - /
    - /api/test
    - /api/db-test
11. Created .env file for environment variables.
12. Created .env.example file for reference.
13. Tested backend locally using node server.js.
14. Installed PM2 process manager.
15. Deployed backend using PM2.
16. Enabled PM2 startup on system reboot.
17. Saved PM2 process list.
18. Verified backend is running successfully on port 3000.

## Running the Backend Application with PM2
pm2 start server.js --name <what_you_want_to_name_the_process>
pm2 save