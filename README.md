# ERPNext Setup Guide for Shah Printing Press

This guide will help you set up ERPNext on your Mac, even if you don't have a coding background. Just follow each step carefully!

## Prerequisites (One-time Setup)

### Step 1: Install Homebrew (Mac's Package Manager)
Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Required Software
Run these commands one by one in Terminal:
```bash
# Install Python
brew install python@3.11

# Install Node.js
brew install node

# Install MariaDB (Database)
brew install mariadb

# Install Redis (Caching)
brew install redis

# Install wkhtmltopdf (PDF Generation)
brew install --cask wkhtmltopdf
```

### Step 3: Start Database Services
```bash
# Start MariaDB
brew services start mariadb

# Start Redis
brew services start redis
```

### Step 4: Set MariaDB Root Password
**⚠️ IMPORTANT: Open a NEW Terminal window for this step (needs sudo)**

```bash
sudo mysql -u root
```

Then type these commands in the MariaDB prompt:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'admin';
FLUSH PRIVILEGES;
exit;
```

## ERPNext Installation

### Step 5: Create Project Directory
```bash
# Create a folder for your project
mkdir -p ~/personal-workspace/shah-erp
cd ~/personal-workspace/shah-erp
```

### Step 6: Clone the Required Repositories
```bash
# Create bench directory structure
mkdir -p frappe-bench/apps
cd frappe-bench/apps

# Clone Frappe (the foundation)
git clone https://github.com/frappe/frappe.git --branch version-15 --depth 1

# Clone ERPNext (the ERP system)
git clone https://github.com/frappe/erpnext.git --branch version-15 --depth 1

# Go back to frappe-bench directory
cd ..
```

### Step 7: Set Up Python Environment
```bash
# Create virtual environment
python3 -m venv env

# Activate it
source env/bin/activate

# Install bench (Frappe's command-line tool)
pip install frappe-bench
```

### Step 8: Install Python Dependencies
```bash
# Install Frappe dependencies
pip install -e apps/frappe

# Install ERPNext dependencies  
pip install -e apps/erpnext

# Install additional required package
pip install eventlet
```

### Step 9: Install JavaScript Dependencies
```bash
# Install Frappe JS dependencies
cd apps/frappe && yarn install && cd ../..

# Install ERPNext JS dependencies
cd apps/erpnext && yarn install && cd ../..
```

### Step 10: Configure Bench
```bash
# Create necessary directories
mkdir -p sites config logs

# Create apps.txt file
echo -e "frappe\nerpnext" > sites/apps.txt

# Setup Redis configuration
bench setup redis

# Setup process file
bench setup procfile
```

### Step 11: Create Your Site
```bash
# Create new site (you'll be asked for MariaDB password: enter 'admin')
bench new-site shah-printing.local --mariadb-root-password admin --admin-password admin

# Set it as current site
bench use shah-printing.local

# Install ERPNext on the site
bench --site shah-printing.local install-app erpnext
```

### Step 12: Add Site to Hosts File
**⚠️ IMPORTANT: Open a NEW Terminal window for this step (needs sudo)**

```bash
sudo nano /etc/hosts
```

Add this line at the end:
```
127.0.0.1    shah-printing.local
```

Save the file:
- Press `Ctrl + O` (then Enter) to save
- Press `Ctrl + X` to exit

## Starting ERPNext

### Step 13: Start the Application
Back in your original Terminal window:
```bash
# Make sure you're in frappe-bench directory
cd ~/personal-workspace/shah-erp/frappe-bench

# Activate virtual environment
source env/bin/activate

# Start ERPNext
bench start
```

### Step 14: Access ERPNext
Open your web browser and go to:
- http://localhost:8000
- OR http://shah-printing.local:8000

### Login Credentials
- **Username**: Administrator
- **Password**: admin

## Troubleshooting

### If port 8000 is already in use:
```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process (replace PID with the number from above)
kill PID
```

### If bench won't start:
```bash
# Kill all bench processes
pkill -f bench

# Try starting again
bench start
```

### If you see database errors:
Make sure MariaDB is running:
```bash
brew services restart mariadb
```

## Daily Usage

### To start ERPNext each day:
1. Open Terminal
2. Navigate to project: `cd ~/personal-workspace/shah-erp/frappe-bench`
3. Activate environment: `source env/bin/activate`
4. Start bench: `bench start`
5. Open browser to http://localhost:8000

### To stop ERPNext:
Press `Ctrl + C` in the Terminal where bench is running

## Important Notes

- Keep the Terminal window open while using ERPNext
- The first setup takes 30-45 minutes
- Save the admin password somewhere safe
- For production use, consider additional security measures

## Getting Help

If you get stuck:
1. Take a screenshot of the error
2. Copy the exact error message
3. Check the Troubleshooting section above
4. Search for the error on [Frappe Forum](https://discuss.frappe.io/)

Good luck with your printing press management! 🎉