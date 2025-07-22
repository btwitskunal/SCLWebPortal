const pool = require('./db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const TEMPLATE_FILE_PATH = path.join(__dirname, '../template.xlsx');

async function getTemplateDefinition() {
  if (!fs.existsSync(TEMPLATE_FILE_PATH)) {
    throw new Error('Template file not found at ' + TEMPLATE_FILE_PATH);
  }
  const workbook = XLSX.readFile(TEMPLATE_FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = rows[0];
  const types = rows[1] || headers.map(() => 'TEXT'); // Default to TEXT if no type row
  return headers.map((name, index) => ({
    name: name,
    type: (types[index] || 'TEXT').toUpperCase(),
    position: index
  }));
}

async function setTemplateDefinition(columns) {
  // This function is now obsolete as the template.xlsx file is the source of truth.
  // Kept to avoid breaking other parts of the code that might still call it.
  console.warn('setTemplateDefinition is obsolete and should not be used. The template is managed by the template.xlsx file.');
  return Promise.resolve();
}

async function generateTemplateFile() {
  // This function is now obsolete. The template file is managed manually.
  console.warn('generateTemplateFile is obsolete. The template is managed by the template.xlsx file.');
  return Promise.resolve(TEMPLATE_FILE_PATH);
}

async function syncDataTableSchema() {
  const DATA_TABLE = 'uploaded_data';
  const columns = await getTemplateDefinition();
  // Get current columns in uploaded_data
  const [currentColsRows] = await pool.query(`SHOW COLUMNS FROM ${DATA_TABLE}`);
  const currentCols = currentColsRows.map(col => col.Field);

  // Determine columns to add
  for (const col of columns) {
    if (!currentCols.includes(col.name)) {
      let type = 'VARCHAR(255)';
      if (col.type === 'INT') type = 'INT';
      else if (col.type === 'DATE') type = 'DATE';
      else if (col.type === 'FLOAT' || col.type === 'DOUBLE') type = 'DOUBLE';
      // Add column
      await pool.query(`ALTER TABLE ${DATA_TABLE} ADD COLUMN \`${col.name}\` ${type} NULL`);
    }
  }
}

module.exports = {
  getTemplateDefinition,
  setTemplateDefinition,
  generateTemplateFile,
  syncDataTableSchema
};