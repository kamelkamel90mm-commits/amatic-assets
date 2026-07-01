# goldsvet-script-11.5
⚠️ Important Notice About This Repository
Welcome! This repository contains version 8.5 of our platform. Please read the following information carefully to understand what you're accessing and how it differs from our premium offerings.

🔹 About Version 8.5 (This Repository)
The code provided here is an earlier, limited version intended for public review and educational purposes. While it's functional, it does not include our premium integrations or advanced features.

🔸 About Version 11.5 (Demo & Production Version)
The demo version available on our website is version 11.5, which is the most recent and fully-featured release. This version is not open source and is only available for commercial use through purchase or rental.

Version 11.5 Includes:
Full integration with premium sportsbook providers

Access to live casino providers

Enhanced admin and reporting tools

Improved performance and scalability for production environments

Ongoing updates and support for licensed users

💼 Commercial Options
If you are interested in using the full version (v11.5) in your own project, we offer two options:

Purchase the full source code

Rent the platform as a service
For pricing, licensing, or further information, please contact us directly via the contact details provided in this repository or on our website.

🛠️ Aapanel / Cpanel / Plesk Casino Server Configuration Guide
✅ Recommended Server Setup:
OS: AlmaLinux 8 or CentOS 7

Web Server: Apache

Database: MySQL

PHP: Version 7.3 – 7.4

Laravel: Version 8

Node.js: Version 16

Process Manager: PM2

Cache: Redis

SSL: Enforce HTTPS for your domain

🔧 Installation Steps:
Clone or extract this repository into your public_html folder.

Enable PHP Extensions:

fileinfo

imagick

redis

Create a new email account for use with the system.

Create a MySQL database and grant full privileges to a user.

Import the SQL file from /addons/db.sql using phpMyAdmin or CLI.

Run the following in the terminal (inside the public_html folder):

bash
Copy
Edit
composer install
Generate and install SSL:

Use a valid SSL certificate (Let’s Encrypt or commercial)

Save files as:

CRT: crt.crt

KEY: key.key

BUNDLE: cabundle.crt (if needed)

Place them in PTWebSocket/ssl/

Edit configuration files:

.env

/config/app.php (update the URL on line 65)

Socket Configurations:

Edit any necessary settings in .json files in /public/

🔒 User Password Reset Tip
This setup includes demo user accounts. If needed, regenerate password hashes using a tool like: https://bcrypt-generator.com

Update password in the database with:

sql
Copy
Edit
UPDATE w_users SET password = '$2a$12$s1RpwEx/oTL3vYQGZjC33eBHECRJb7gkjmAk9Tmyefub7gQ4nh8XS';
This will set all user passwords to Test123

🎮 Game Files
Currently, around 1000 games (~40GB) are supported.
Files will be uploaded soon. For early access, join our support channels below.

📦 PM2 Commands
Start WebSocket services individually:

bash
Copy
Edit
pm2 start Arcade.js --watch  
pm2 start Server.js --watch  
pm2 start Slots.js --watch
Or all at once:

bash
Copy
Edit
pm2 start Arcade.js --watch && pm2 start Server.js --watch && pm2 start Slots.js --watch
Useful maintenance commands:

bash
Copy
Edit
pm2 stop all  
pm2 delete all  
pm2 flush  
pm2 logs
Full PM2 documentation

🧪 Test WebSocket Connection (Optional)
Install wscat:

bash
Copy
Edit
npm install -g wscat
Then test:

bash
Copy
Edit
wscat -c "wss://your-domain.com:PORT/slots"
Make sure you open the necessary ports (e.g., 22154, 22188, 22197) in your server’s firewall.

🧹 Troubleshooting Commands
If things don't load correctly, try clearing caches:

bash
Copy
Edit
php artisan cache:clear  
php artisan view:clear  
php artisan config:clear  
php artisan event:clear  
php artisan route:clear
📬 Need Help?
💬 Telegram: https://t.me/supergoaladmi

💻 Discord: https://discord.gg/3wEnGgjK

🔗 Demo Site: https://demo.betplatform.dev/
