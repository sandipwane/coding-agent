# ERPNext Setup Plan for Shah Printing Press

## Overview
Set up ERPNext locally to evaluate and customize for printing press operations.

## Phase 1: Environment Setup (Day 1)
1. **Install Prerequisites**
   - Python 3.10+
   - Node.js 18+
   - MariaDB
   - Redis
   - wkhtmltopdf (for PDF generation)

2. **Install Bench CLI**
   ```bash
   pip3 install frappe-bench
   ```

3. **Initialize Frappe Bench**
   ```bash
   bench init frappe-bench --frappe-branch version-15
   cd frappe-bench
   ```

## Phase 2: ERPNext Installation (Day 1)
1. **Get ERPNext App**
   ```bash
   bench get-app erpnext --branch version-15
   ```

2. **Create New Site**
   ```bash
   bench new-site shah-printing.local
   bench --site shah-printing.local install-app erpnext
   ```

3. **Start Development Server**
   ```bash
   bench start
   ```

## Phase 3: Initial Configuration (Day 2)
1. **Company Setup**
   - Create "SAI PRINTING WORKFLOW" company
   - Configure fiscal year
   - Set up chart of accounts

2. **Master Data Setup**
   - Create print-specific Item Groups (Paper, Ink, Plates)
   - Set up Units of Measurement (Sheets, Reams, KG)
   - Configure Workstations (Printing Machines)

## Phase 4: Printing Customizations (Week 1)
1. **Custom Fields**
   - Add "Plate Number" to Work Order
   - Add "Color Count" to Items
   - Add "Paper GSM" to Raw Materials

2. **Custom Doctypes**
   - Print Job Estimation
   - Plate Management
   - Color Separation Tracking

3. **Workflows**
   - Print Job Approval
   - Quality Check Process

## Phase 5: Testing & Evaluation (Week 2)
1. **Sample Data Entry**
   - Create sample print jobs
   - Test work order flow
   - Verify inventory tracking

2. **User Training**
   - Create test users
   - Document workflows
   - Gather feedback

## Directory Structure
```
shah-erp/
├── frappe-bench/
│   ├── apps/
│   │   ├── frappe/
│   │   └── erpnext/
│   ├── sites/
│   │   └── shah-printing.local/
│   └── config/
└── documentation/
    └── printing-customizations/
```

## Next Steps After Setup
- Map legacy system data for migration
- Create custom print job module
- Set up automated backups
- Configure for multi-user access
anokhishah@123