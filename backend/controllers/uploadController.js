const XLSX = require('xlsx');
const templateManager = require('../utils/templateManager');
const pool = require('../utils/db');
const path = require('path');

function buildValidationMap(templatePath) {
  const workbook = XLSX.readFile(templatePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const header = rows[0].map(h => h.toString().trim());
  // For each column, collect allowed values from template rows (skip empty/optional/none)
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
    // Only add to map if there are allowed values
    if (allowedSet.size > 0) {
      validationMap[header[colIdx]] = allowedSet;
    }
  }
  return { validationMap, header };
}

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const uploadedColumns = data[0];
    const template = await templateManager.getTemplateDefinition();
    const templateColumns = template.map(col => col.name);

    // Validate columns
    if (JSON.stringify(uploadedColumns) !== JSON.stringify(templateColumns)) {
      return res.status(400).json({ error: 'Uploaded file columns do not match template' });
    }

    // Build validation map dynamically from template.xlsx
    const templatePath = path.join(__dirname, '../template.xlsx');
    const { validationMap, header } = buildValidationMap(templatePath);

    let inserted = 0;
    let errors = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue; // skip empty rows
      const rowObj = {};
      let rowHasError = false;
      for (let j = 0; j < templateColumns.length; j++) {
        rowObj[templateColumns[j]] = row[j] !== undefined ? row[j] : null;
        // Validation for this column if allowed values exist
        const colName = templateColumns[j];
        if (validationMap[colName]) {
          const cellValue = row[j] ? row[j].toString().trim().toLowerCase() : '';
          if (
            cellValue &&
            !validationMap[colName].has(cellValue) &&
            cellValue !== 'optional' &&
            cellValue !== 'none'
          ) {
            errors.push({
              row: i + 1,
              error: `Invalid value "${row[j]}" for column "${colName}". Allowed: ${Array.from(validationMap[colName]).join(', ')}`
            });
            rowHasError = true;
            break; // Stop further validation for this row
          }
        }
      }
      if (rowHasError) continue;

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
    res.json({ message: 'File validated and uploaded successfully', rowsInserted: inserted, errors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
};