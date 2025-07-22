const templateManager = require('../utils/templateManager');
const path = require('path');

exports.getTemplate = async (req, res) => {
  try {
    const columns = await templateManager.getTemplateDefinition();
    res.json({ columns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get template: ' + err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  // This endpoint is now obsolete.
  res.status(404).json({ error: 'This endpoint is no longer available. Template is managed via the template.xlsx file.' });
};

exports.downloadTemplate = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../template.xlsx');
    res.download(filePath, 'template.xlsx');
  } catch (err) {
    res.status(500).json({ error: 'Failed to download template: ' + err.message });
  }
}; 