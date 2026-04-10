function renderPriceChart(data) {
  const chartEl = document.querySelector("#chart");
  if (!chartEl) return;

  chartEl.innerHTML = "";

  if (!data || !data.length) {
    chartEl.innerHTML = "<p style='color:#6b7c98;font-size:0.9rem;'>Sin datos para graficar.</p>";
    return;
  }

  const options = {
    chart: {
      type: "line",
      height: 160,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent"
    },
    series: [
      {
        name: "Precio nuevo",
        data: data.map(item => Number(item.precio_nuevo))
      }
    ],
    xaxis: {
      categories: data.map(item =>
        new Date(item.fecha_cambio).toLocaleDateString("es-CO")
      ),
      labels: {
        style: {
          colors: "#7083a3",
          fontSize: "11px"
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: {
          colors: "#7083a3",
          fontSize: "11px"
        }
      }
    },
    stroke: {
      curve: "smooth",
      width: 3
    },
    colors: ["#3b82f6"],
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 0,
      hover: { size: 5 }
    },
    grid: {
      borderColor: "#e8eef7",
      strokeDashArray: 4
    },
    tooltip: {
      theme: "light"
    }
  };

  const chart = new ApexCharts(chartEl, options);
  chart.render();
}