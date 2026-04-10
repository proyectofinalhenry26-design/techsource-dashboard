function renderPriceChart(data) {
  const chartEl = document.querySelector("#chart");
  chartEl.innerHTML = "";

  const options = {
    chart: {
      type: "line",
      height: 320,
      toolbar: { show: false }
    },
    series: [{
      name: "Precio nuevo",
      data: data.map(item => Number(item.precio_nuevo))
    }],
    xaxis: {
      categories: data.map(item => new Date(item.fecha_cambio).toLocaleDateString())
    },
    stroke: {
      curve: "smooth",
      width: 3
    },
    dataLabels: {
      enabled: false
    },
    colors: ["#2563eb"],
    grid: {
      borderColor: "#e5e7eb"
    }
  };

  const chart = new ApexCharts(chartEl, options);
  chart.render();
}