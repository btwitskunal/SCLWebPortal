window.renderAnalysisPage = async function() {
  // Fetch template columns
  let columns = [];
  try {
    const res = await fetch('/template');
    const data = await res.json();
    columns = data.columns || [];
  } catch (e) {}
  // Build form
  document.getElementById('analysis-section').innerHTML = `
    <h2>Data Analysis</h2>
    <form id="analysis-form">
      <label>Chart Type:</label>
      <select id="chart-type">
        <option value="bar">Bar</option>
        <option value="line">Line</option>
        <option value="pie">Pie</option>
      </select>
      <label>Group By:</label>
      <select id="groupBy" multiple>${columns.map(col => `<option value="${col.name}">${col.name}</option>`).join('')}</select>
      <div id="agg-list"></div>
      <button type="button" id="add-agg">+ Add Aggregation</button>
      <label>Filter (optional):</label>
      <input type="text" id="filter-col" placeholder="Column" list="col-list" />
      <datalist id="col-list">${columns.map(col => `<option value="${col.name}">`).join('')}</datalist>
      <select id="filter-op">
        <option value="=">=</option>
        <option value=">">&gt;</option>
        <option value="<">&lt;</option>
        <option value=">=">&ge;</option>
        <option value="<=">&le;</option>
        <option value="LIKE">LIKE</option>
      </select>
      <input type="text" id="filter-val" placeholder="Value" />
      <button type="submit">Analyze</button>
    </form>
    <canvas id="analysis-chart" width="600" height="300" aria-label="Data chart" role="img"></canvas>
    <div id="analysis-result"></div>
  `;
  // Aggregation selectors
  function renderAggList() {
    const aggList = document.getElementById('agg-list');
    if (!aggList) return;
    if (!aggList.children.length) addAggSelector();
  }
  function addAggSelector() {
    const idx = document.querySelectorAll('.agg-row').length;
    const div = document.createElement('div');
    div.className = 'agg-row';
    div.innerHTML = `
      <select class="agg-col">${columns.map(col => `<option value="${col.name}">${col.name}</option>`).join('')}</select>
      <select class="agg-op">
        <option value="SUM">SUM</option>
        <option value="COUNT">COUNT</option>
        <option value="AVG">AVG</option>
        <option value="MIN">MIN</option>
        <option value="MAX">MAX</option>
      </select>
      <input type="text" class="agg-alias" placeholder="Alias (optional)" aria-label="Aggregation alias" />
      <button type="button" class="remove-agg" aria-label="Remove aggregation">&times;</button>
    `;
    div.querySelector('.remove-agg').onclick = () => div.remove();
    document.getElementById('agg-list').appendChild(div);
  }
  document.getElementById('add-agg').onclick = addAggSelector;
  renderAggList();
  document.getElementById('analysis-form').onsubmit = async function(e) {
    e.preventDefault();
    const chartType = document.getElementById('chart-type').value;
    const groupBy = Array.from(document.getElementById('groupBy').selectedOptions).map(o => o.value);
    // Gather all aggregations
    const aggRows = document.querySelectorAll('.agg-row');
    const aggregations = Array.from(aggRows).map(row => {
      const col = row.querySelector('.agg-col').value;
      const op = row.querySelector('.agg-op').value;
      const alias = row.querySelector('.agg-alias').value || `${op.toLowerCase()}_${col}`;
      return { column: col, operation: op, alias };
    });
    const filterCol = document.getElementById('filter-col').value;
    const filterOp = document.getElementById('filter-op').value;
    const filterVal = document.getElementById('filter-val').value;
    const body = {
      groupBy: groupBy.length ? groupBy : undefined,
      aggregations,
      filters: filterCol && filterVal ? [{ column: filterCol, operator: filterOp, value: filterVal }] : undefined
    };
    const res = await fetch('/analysis/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.summary) {
      renderChart(data.summary, groupBy, aggregations, chartType);
      document.getElementById('analysis-result').innerText = '';
    } else {
      document.getElementById('analysis-result').innerText = data.error || 'No data';
    }
  };
}

// Show analysis page when navigated
window.showPage = async function(page) {
  if (page === 'analysis') {
    await window.renderAnalysisPage();
    document.getElementById('analysis-section').style.display = 'block';
    document.getElementById('upload-modal').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
  }
};
