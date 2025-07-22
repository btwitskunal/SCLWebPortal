const pool = require('../utils/db');

// GET /analysis/data
exports.getData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(`SELECT * FROM uploaded_data LIMIT ? OFFSET ?`, [limit, offset]);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};

// POST /analysis/summary
exports.getSummary = async (req, res) => {
  try {
    // Backward compatibility
    let { column, operation, groupBy, filters, aggregations, orderBy, limit, offset, having } = req.body;
    let groupByArr = [];
    let aggsArr = [];
    if (aggregations && Array.isArray(aggregations)) {
      aggsArr = aggregations;
    } else if (column && operation) {
      aggsArr = [{ column, operation, alias: 'value' }];
    } else {
      return res.status(400).json({ error: 'At least one aggregation (column + operation) is required' });
    }
    if (groupBy) {
      groupByArr = Array.isArray(groupBy) ? groupBy : [groupBy];
    }
    // Build SELECT
    const selectParts = [];
    for (const g of groupByArr) {
      selectParts.push(`\`${g}\``);
    }
    for (const agg of aggsArr) {
      const op = agg.operation.toUpperCase();
      const alias = agg.alias || `${op.toLowerCase()}_${agg.column}`;
      selectParts.push(`${op}(\`${agg.column}\`) AS \`${alias}\``);
    }
    let sql = `SELECT ${selectParts.join(', ')} FROM uploaded_data`;
    // WHERE
    let whereParts = [];
    let params = [];
    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        if (["=", "!=", "<", ">", "<=", ">=", "LIKE", "IN"].includes(f.operator.toUpperCase())) {
          if (f.operator.toUpperCase() === 'IN' && Array.isArray(f.value)) {
            whereParts.push(`\`${f.column}\` IN (${f.value.map(() => '?').join(',')})`);
            params.push(...f.value);
          } else {
            whereParts.push(`\`${f.column}\` ${f.operator} ?`);
            params.push(f.value);
          }
        }
      }
    }
    if (whereParts.length > 0) {
      sql += ' WHERE ' + whereParts.join(' AND ');
    }
    // GROUP BY
    if (groupByArr.length > 0) {
      sql += ' GROUP BY ' + groupByArr.map(g => `\`${g}\``).join(', ');
    }
    // HAVING
    let havingParts = [];
    let havingParams = [];
    if (having && Array.isArray(having)) {
      for (const h of having) {
        if (["=", "!=", "<", ">", "<=", ">=", "LIKE", "IN"].includes(h.operator.toUpperCase())) {
          if (h.operator.toUpperCase() === 'IN' && Array.isArray(h.value)) {
            havingParts.push(`\`${h.column}\` IN (${h.value.map(() => '?').join(',')})`);
            havingParams.push(...h.value);
          } else {
            havingParts.push(`\`${h.column}\` ${h.operator} ?`);
            havingParams.push(h.value);
          }
        }
      }
    }
    if (havingParts.length > 0) {
      sql += ' HAVING ' + havingParts.join(' AND ');
    }
    // ORDER BY
    if (orderBy && Array.isArray(orderBy) && orderBy.length > 0) {
      sql += ' ORDER BY ' + orderBy.map(o => `\`${o.column}\` ${o.direction && o.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`).join(', ');
    }
    // LIMIT/OFFSET
    if (typeof limit === 'number' && limit > 0) {
      sql += ' LIMIT ?';
      params = params.concat(havingParams);
      params.push(limit);
      if (typeof offset === 'number' && offset >= 0) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    } else {
      params = params.concat(havingParams);
    }
    const [rows] = await pool.query(sql, params);
    res.json({ summary: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message });
  }
}; 