const pool = require('../utils/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class DataController {
  // Download data with filters
  static async downloadData(req, res) {
    try {
      const { filters, format = 'xlsx', filename = 'data_export' } = req.body;
      
      // Build SQL query with filters
      let sql = 'SELECT * FROM uploaded_data';
      let params = [];
      let whereParts = [];

      // Apply filters if provided
      if (filters && Array.isArray(filters) && filters.length > 0) {
        for (const filter of filters) {
          const { column, operator, value } = filter;
          
          if (!column || !operator || value === undefined) continue;
          
          // Validate operator
          const validOperators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN'];
          if (!validOperators.includes(operator.toUpperCase())) continue;
          
          if (operator.toUpperCase() === 'IN' && Array.isArray(value)) {
            whereParts.push(`\`${column}\` IN (${value.map(() => '?').join(',')})`);
            params.push(...value);
          } else if (operator.toUpperCase() === 'LIKE') {
            whereParts.push(`\`${column}\` LIKE ?`);
            params.push(`%${value}%`);
          } else {
            whereParts.push(`\`${column}\` ${operator} ?`);
            params.push(value);
          }
        }
      }

      if (whereParts.length > 0) {
        sql += ' WHERE ' + whereParts.join(' AND ');
      }

      // Add ordering
      sql += ' ORDER BY id DESC';

      // Execute query
      const [rows] = await pool.query(sql, params);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'No data found matching the filters' });
      }

      // Generate file based on format
      if (format.toLowerCase() === 'xlsx') {
        // Create Excel file
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

        // Create temporary file
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `${filename}_${Date.now()}.xlsx`);
        XLSX.writeFile(workbook, tempFilePath);

        // Send file
        res.download(tempFilePath, `${filename}.xlsx`, (err) => {
          if (err) {
            console.error('Download error:', err);
          }
          // Clean up temporary file
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
          });
        });
      } else {
        // Return JSON data
        res.json({ 
          data: rows,
          count: rows.length,
          filters_applied: filters || [],
          exported_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in downloadData:', error);
      res.status(500).json({ error: 'Failed to download data' });
    }
  }

  // Get data summary/stats for filtering UI
  static async getDataSummary(req, res) {
    try {
      // Get total record count
      const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM uploaded_data');
      const total = totalResult[0].total;

      // Get column information from template
      const [columns] = await pool.query('SHOW COLUMNS FROM uploaded_data');
      const availableColumns = columns
        .filter(col => col.Field !== 'id') // Exclude auto-increment ID
        .map(col => ({
          name: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES'
        }));

      // Get unique values for key columns (for filter dropdowns)
      const uniqueValues = {};
      for (const column of availableColumns.slice(0, 10)) { // Limit to first 10 columns
        try {
          const [values] = await pool.query(
            `SELECT DISTINCT \`${column.name}\` as value FROM uploaded_data WHERE \`${column.name}\` IS NOT NULL ORDER BY \`${column.name}\` LIMIT 100`
          );
          uniqueValues[column.name] = values.map(row => row.value);
        } catch (err) {
          // Skip columns that cause errors
          console.warn(`Could not get unique values for column ${column.name}:`, err.message);
        }
      }

      res.json({
        total_records: total,
        available_columns: availableColumns,
        unique_values: uniqueValues,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getDataSummary:', error);
      res.status(500).json({ error: 'Failed to get data summary' });
    }
  }

  // Get filtered data count (for preview before download)
  static async getFilteredCount(req, res) {
    try {
      const { filters } = req.body;
      
      let sql = 'SELECT COUNT(*) as count FROM uploaded_data';
      let params = [];
      let whereParts = [];

      // Apply filters if provided
      if (filters && Array.isArray(filters) && filters.length > 0) {
        for (const filter of filters) {
          const { column, operator, value } = filter;
          
          if (!column || !operator || value === undefined) continue;
          
          const validOperators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN'];
          if (!validOperators.includes(operator.toUpperCase())) continue;
          
          if (operator.toUpperCase() === 'IN' && Array.isArray(value)) {
            whereParts.push(`\`${column}\` IN (${value.map(() => '?').join(',')})`);
            params.push(...value);
          } else if (operator.toUpperCase() === 'LIKE') {
            whereParts.push(`\`${column}\` LIKE ?`);
            params.push(`%${value}%`);
          } else {
            whereParts.push(`\`${column}\` ${operator} ?`);
            params.push(value);
          }
        }
      }

      if (whereParts.length > 0) {
        sql += ' WHERE ' + whereParts.join(' AND ');
      }

      const [result] = await pool.query(sql, params);
      
      res.json({
        count: result[0].count,
        filters_applied: filters || []
      });
    } catch (error) {
      console.error('Error in getFilteredCount:', error);
      res.status(500).json({ error: 'Failed to get filtered count' });
    }
  }
}

module.exports = DataController;