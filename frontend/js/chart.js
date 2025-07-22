function renderChart(data, groupBy, aggregations, chartType = 'bar') {
  // Load Chart.js if not loaded
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => renderChart(data, groupBy, aggregations, chartType);
    document.head.appendChild(script);
    return;
  }
  const ctx = document.getElementById('analysis-chart').getContext('2d');
  if (window.analysisChart) window.analysisChart.destroy();
  let labels;
  if (chartType === 'pie') {
    labels = data.map(row => groupBy && groupBy.length ? row[groupBy[0]] : '');
  } else {
    labels = data.map(row => groupBy && groupBy.length ? groupBy.map(g => row[g]).join(' / ') : '');
  }
  const colors = [
    '#007bff', '#28a745', '#ffc107', '#dc3545', '#6610f2', '#20c997', '#fd7e14', '#6f42c1', '#e83e8c', '#17a2b8'
  ];
  let datasets = [];
  if (chartType === 'pie') {
    const agg = aggregations[0];
    const values = data.map(row => row[agg.alias]);
    datasets = [{
      label: agg.alias,
      data: values,
      backgroundColor: colors,
      borderColor: '#fff',
      borderWidth: 1
    }];
  } else {
    datasets = aggregations.map((agg, i) => ({
      label: agg.alias,
      data: data.map(row => row[agg.alias]),
      backgroundColor: colors[i % colors.length],
      borderColor: colors[i % colors.length],
      fill: false
    }));
  }
  window.analysisChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      elements: { line: { tension: 0.3 } },
      interaction: { mode: 'index', intersect: false },
      scales: chartType === 'pie' ? {} : { x: { title: { display: true, text: groupBy.join(', '), color: '#343a40' } }, y: { beginAtZero: true } },
      animation: { duration: 600 },
      aria: { enabled: true, label: 'Data chart' }
    }
  });
}
