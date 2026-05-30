import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { weatherEmoji } from '../lib/weather-symbols.js';

const WeatherMainChart = ({ hourly }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !hourly || !hourly.length) return;

    const labels = hourly.map((h) => {
      const d = new Date(h.time);
      const hr = d.toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2);
      return hr;
    });

    let nowIdx = hourly.findIndex((h) => !h.is_history);
    if (nowIdx < 0) nowIdx = hourly.length;

    const tempHist = hourly.map((h) => (h.is_history ? h.temp : null));
    const tempFcst = hourly.map((h) => (h.is_history ? null : h.temp));
    if (nowIdx > 0 && nowIdx < hourly.length) {
      tempHist[nowIdx] = hourly[nowIdx - 1].temp;
    }

    const rainExp = hourly.map((h) => h.rain ?? 0);
    const rainUnc = hourly.map((h) => {
      const mx = h.rain_max ?? h.rain ?? 0;
      const exp = h.rain ?? 0;
      return Math.max(0, mx - exp);
    });
    const wind = hourly.map((h) => h.wind ?? 0);

    const nowLinePlugin = {
      id: 'nowLine',
      afterDraw(chart) {
        if (nowIdx <= 0 || nowIdx >= hourly.length) return;
        const xScale = chart.scales.x;
        const yArea = chart.chartArea;
        const x = xScale.getPixelForValue(nowIdx) - ((xScale.getPixelForValue(nowIdx) - xScale.getPixelForValue(nowIdx - 1)) / 2);
        const ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(178, 58, 44, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, yArea.top);
        ctx.lineTo(x, yArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(178, 58, 44, 0.9)';
        ctx.font = '600 10px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NÅ', x, yArea.top + 10);
        ctx.restore();
      },
    };

    const symbolPlugin = {
      id: 'weatherSymbols',
      afterDraw(chart) {
        const xScale = chart.scales.x;
        const yArea = chart.chartArea;
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        const step = Math.max(1, Math.round(hourly.length / 12));
        hourly.forEach((h, idx) => {
          if (idx % step !== 0) return;
          const x = xScale.getPixelForValue(idx);
          ctx.fillText(weatherEmoji(h.symbol), x, yArea.top - 14);
        });
        ctx.restore();
      },
    };

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      plugins: [nowLinePlugin, symbolPlugin],
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Usikkerhet (maks)',
            data: rainUnc,
            backgroundColor: (ctx) => ctx.dataIndex < nowIdx ? 'rgba(143, 182, 204, 0.35)' : 'rgba(143, 182, 204, 0.7)',
            yAxisID: 'yRain',
            stack: 'precip',
            order: 3,
            barPercentage: 1,
            categoryPercentage: 0.85,
          },
          {
            type: 'bar',
            label: 'Nedbør (forventet)',
            data: rainExp,
            backgroundColor: (ctx) => ctx.dataIndex < nowIdx ? 'rgba(47, 123, 160, 0.5)' : 'rgba(47, 123, 160, 0.9)',
            yAxisID: 'yRain',
            stack: 'precip',
            order: 2,
            barPercentage: 1,
            categoryPercentage: 0.85,
          },
          {
            type: 'line',
            label: 'Vind (m/s)',
            data: wind,
            borderColor: 'rgba(92, 103, 112, 0.8)',
            borderDash: [3, 3],
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.3,
            fill: false,
            yAxisID: 'yWind',
            order: 1,
            spanGaps: false,
          },
          {
            type: 'line',
            label: 'Temperatur (historikk)',
            data: tempHist,
            borderColor: 'rgba(198, 138, 46, 0.5)',
            backgroundColor: 'rgba(198, 138, 46, 0.06)',
            borderWidth: 2,
            borderDash: [2, 3],
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'yTemp',
            order: 0,
            spanGaps: false,
          },
          {
            type: 'line',
            label: 'Temperatur',
            data: tempFcst,
            borderColor: 'rgba(178, 58, 44, 1)',
            backgroundColor: 'rgba(178, 58, 44, 0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'yTemp',
            order: 0,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 26 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.dataset.label !== 'Temperatur (historikk)' || item.raw != null,
            callbacks: {
              title: (items) => {
                const i = items[0].dataIndex;
                const prefix = i < nowIdx ? '(tidligere) ' : '';
                return `${prefix}kl. ${items[0].label}:00`;
              },
              label: (ctx) => {
                if (ctx.dataset.label === 'Temperatur' || ctx.dataset.label === 'Temperatur (historikk)') {
                  if (ctx.parsed.y == null) return null;
                  return `Temp: ${ctx.parsed.y.toFixed(1)}°`;
                }
                if (ctx.dataset.label === 'Nedbør (forventet)') return `Regn: ${ctx.parsed.y.toFixed(1)} mm`;
                if (ctx.dataset.label === 'Usikkerhet (maks)') {
                  const tot = ctx.parsed.y + (ctx.chart.data.datasets[1].data[ctx.dataIndex] || 0);
                  return `Maks regn: ${tot.toFixed(1)} mm`;
                }
                if (ctx.dataset.label === 'Vind (m/s)') return `Vind: ${ctx.parsed.y.toFixed(1)} m/s`;
                return null;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 11 } } },
          yTemp: { position: 'left', grid: { color: 'rgba(20,23,26,0.06)' }, ticks: { font: { size: 11 }, callback: (v) => v + '°' } },
          yRain: { position: 'right', grid: { display: false }, min: 0, suggestedMax: 2, ticks: { font: { size: 11 } } },
          yWind: { position: 'right', offset: true, grid: { display: false }, min: 0, suggestedMax: 12, ticks: { font: { size: 11 } } },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [hourly]);

  return <canvas ref={canvasRef} role="img" aria-label="Kombinert graf over temperatur, nedbør og vind for dagens døgn." />;
};

export default WeatherMainChart;
