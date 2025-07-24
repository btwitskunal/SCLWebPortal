const express = require('express');
const multer = require('multer'); // For handling file uploads
const XLSX = require('xlsx'); // For reading Excel files
const fs = require('fs');
const path = require('path');
const templateManager = require('../utils/templateManager'); // Custom module to read template definition
const pool = require('../utils/db'); // Database connection pool

const router = express.Router();

// Configure multer to store uploaded files in 'uploads/' directory
const upload = multer({ dest: 'uploads/' });

/**
 * Reads the template.xlsx file and builds a validation map.
 * Each column maps to a set of allowed values (excluding 'optional' and 'none').
 */
function buildValidationMap(templatePath) {
  const workbook = XLSX.readFile(templatePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const header = rows[0].map(h => h.toString().trim());
  const validationMap = {};

  for (let colIdx = 0; colIdx < header.length; colIdx++) {
    const allowedSet = new Set();
    for (let i = 1; i < rows.length; i++) {
      const cell = rows[i][colIdx];
      if (cell && typeof cell === 'string') {
        cell.split(',').forEach(val => {
          const v = val.trim().toLowerCase();
          if (v && v !== 'optional' && v !== 'none') allowedSet.add(v);
        });
      }
    }
    if (allowedSet.size > 0) {
      validationMap[header[colIdx]] = allowedSet;
    }
  }

  return { validationMap, header };
}

/**
 * POST /upload
 * Handles Excel file upload, validates data against template,
 * inserts valid rows into DB, and generates error report for invalid rows.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Read uploaded Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const uploadedColumns = data[0];

    // Prevent re-upload if "Error" column is present
    if (uploadedColumns.includes('Error')) {
      return res.status(400).json({ error: 'Please remove the "Error" column before re-uploading the file.' });
    }

    // Get template column definitions
    const template = await templateManager.getTemplateDefinition();
    const templateColumns = template.map(col => col.name);

    // Validate column headers match template
    if (JSON.stringify(uploadedColumns) !== JSON.stringify(templateColumns)) {
      return res.status(400).json({ error: 'Uploaded file columns do not match template' });
    }

    // Build validation map from template.xlsx
    const templatePath = path.join(__dirname, '../template.xlsx');
    const { validationMap } = buildValidationMap(templatePath);

    let inserted = 0;
    let errors = [];

    // Loop through each data row (starting from index 1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const rowObj = {};
      let rowHasError = false;

      // Validate each cell in the row
      for (let j = 0; j < templateColumns.length; j++) {
        const colName = templateColumns[j];
        rowObj[colName] = row[j] !== undefined ? row[j] : null;

        // If validation rules exist for this column, check the value
        if (validationMap[colName]) {
          const cellValue = row[j] ? row[j].toString().trim().toLowerCase() : '';
          if (cellValue && !validationMap[colName].has(cellValue) && cellValue !== 'optional' && cellValue !== 'none') {
            errors.push({
              row: i + 1,
              error: `Invalid value "${row[j]}" for column "${colName}". Allowed: ${Array.from(validationMap[colName]).join(', ')}`
            });
            rowHasError = true;
            break; // Stop further validation for this row
          }
        }
      }

      // Skip row if it has validation errors
      if (rowHasError) continue;

      // Insert valid row into database
      try {
        await pool.query(
          `INSERT INTO uploaded_data (${templateColumns.map(col => `\`${col}\``).join(',')}) VALUES (${templateColumns.map(() => '?').join(',')})`,
          templateColumns.map(col => rowObj[col])
        );
        inserted++;
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    let errorReportUrl = null;

    // If there are errors, generate an Excel error report
    if (errors.length > 0) {
      const errorData = errors.map(e => ({
        Row: e.row,
        ErrorMessage: e.error,
        Error: 'Please remove this column before re-uploading the file.'
      }));
      const errorSheet = XLSX.utils.json_to_sheet(errorData);
      const errorWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(errorWorkbook, errorSheet, 'Errors');

      const errorReportPath = path.join(__dirname, '../uploads/error_report.xlsx');
      XLSX.writeFile(errorWorkbook, errorReportPath);
      errorReportUrl = '/download/error-report';
    }

    // Send response with summary and download link if errors exist
    res.json({
      message: 'File validated and uploaded successfully',
      rowsInserted: inserted,
      errors,
      errorReportUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

/**
 * GET /download/error-report
 * Serves the generated error report Excel file for download.
 */
router.get('/download/error-report', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/error_report.xlsx');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'error_report.xlsx');
  } else {
    res.status(404).send('Error report not found');
  }
});

module.exports = router;
