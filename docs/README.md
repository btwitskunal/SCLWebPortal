# Web Portal Documentation

## Overview
A web portal for authenticated users to upload Excel files, manage dynamic templates, and analyze uploaded data with advanced visualizations. Backend: Node.js/Express, MySQL, Azure AD SSO. Frontend: HTML, CSS, JS.

## Setup Instructions

### Backend
1. Install dependencies:
   ```sh
   cd backend
   npm install
   ```
2. Configure `.env` with Azure AD and MySQL credentials.
3. Create MySQL tables:
   ```sql
   CREATE TABLE template_columns (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     type VARCHAR(50) NOT NULL,
     position INT NOT NULL
   );
   CREATE TABLE uploaded_data (
     id INT AUTO_INCREMENT PRIMARY KEY
     -- columns will be added dynamically
   );
   ```
4. Start backend:
   ```sh
   node app.js
   ```

### Frontend
1. Open `frontend/index.html` in your browser (or serve via a static server).

## API Endpoints

### Authentication
- `GET /auth/login` — Redirect to Azure AD SSO
- `GET /auth/logout` — Logout

### File Upload
- `POST /upload` — Upload Excel file (form-data, field: `file`)

### Template Management
- `GET /template/download` — Download current template as Excel
- `GET /template` — Get current template columns
- `POST /template/update` — Update template (admin)

### Data Analysis
- `GET /analysis/data?page=1&limit=100` — Get uploaded data (paginated)
- `POST /analysis/summary` — Advanced analytics (see below)

#### Example `/analysis/summary` Request
```json
{
  "groupBy": ["department"],
  "aggregations": [
    { "column": "salary", "operation": "SUM", "alias": "totalSalary" },
    { "column": "id", "operation": "COUNT", "alias": "count" }
  ],
  "having": [
    { "column": "count", "operator": ">", "value": 10 }
  ],
  "orderBy": [
    { "column": "totalSalary", "direction": "DESC" }
  ],
  "limit": 20,
  "offset": 0
}
```

## Security Notes
- All endpoints except `/auth/login` are protected by Azure AD SSO.
- Uploaded files are validated and stored securely.
- Data schema is dynamically managed to prevent data loss.
- Follow best practices for environment variable management and HTTPS in production.

## Maintenance
- Update the template via `/template/update` as needed.
- Monitor database schema and storage.
- Keep dependencies up to date.
