const XLSX = require('xlsx');
const templateManager = require('../utils/templateManager');
const pool = require('../utils/db');

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
    // Insert data rows
    let inserted = 0;
    let errors = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue; // skip empty rows
      const rowObj = {};
      for (let j = 0; j < templateColumns.length; j++) {
        rowObj[templateColumns[j]] = row[j] !== undefined ? row[j] : null;
      }
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