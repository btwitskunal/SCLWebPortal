# 🎭 Simple 2-Role System Summary

## **Roles & Capabilities**

### **👤 DO (District Officer)**
- ✅ **Upload** data files
- ✅ **Download** filtered data  
- ✅ **Filter** data by any criteria
- ✅ **Analyze** data (basic & advanced)
- ✅ **Generate** reports
- ✅ **Access** templates

### **👨‍💼 Admin (Sales Executive)**
- ❌ **Upload** data files (NOT allowed)
- ✅ **Download** filtered data
- ✅ **Filter** data by any criteria  
- ✅ **Analyze** data (basic & advanced)
- ✅ **Generate** reports
- ✅ **Access** templates

## **🔧 Quick Setup**

```bash
# 1. Initialize the system
cd backend
npm run setup-roles

# 2. (Optional) Set specific DO user
echo "DO_EMAIL=do@company.com" >> .env
npm run setup-roles

# 3. Start application
npm start
```

## **📡 Key API Endpoints**

```bash
# Upload (DO only)
POST /upload

# Download with filters (both roles)
POST /data/download
{
  "filters": [
    {"column": "region", "operator": "=", "value": "North"},
    {"column": "amount", "operator": ">", "value": 1000}
  ],
  "format": "xlsx",
  "filename": "filtered_export"
}

# Analysis (both roles)
GET /analysis/data
POST /analysis/summary

# Templates (both roles)
GET /template/download
```

## **🛠️ Role Management**

**Default:** New users → Admin role

**Assign DO Role:**
```sql
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'do') 
WHERE email = 'user@example.com';
```

**Assign Admin Role:**
```sql
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'user@example.com';
```

## **📊 Filter Examples**

```javascript
// Example filters for data download
const filters = [
  { column: "district", operator: "=", value: "Mumbai" },
  { column: "sales_date", operator: ">=", value: "2024-01-01" },
  { column: "amount", operator: ">", value: 5000 },
  { column: "status", operator: "IN", value: ["Active", "Pending"] }
];
```

## **🔍 System Check**

```sql
-- View all users and their roles
SELECT u.email, u.display_name, r.name as role 
FROM users u 
LEFT JOIN roles r ON u.role_id = r.id;

-- Count users by role
SELECT r.name as role, COUNT(u.id) as users 
FROM roles r 
LEFT JOIN users u ON r.id = u.role_id 
GROUP BY r.name;
```

---

**Simple & Effective:** 2 roles, clear permissions, filtered downloads! 🎯