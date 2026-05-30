import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { weatherEmoji } from '../lib/weather-symbols.js';

const WeatherDayChart = ({ hours, best6h }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !hours || !hours.length) return;

    const labels = hours.map((h) => {
      const d = new Date(h.time);
      return d.toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2);
    });
    const temp = hours.map((h) => h.temp);
    const rain = hours.map((h) => h.rain ?? 0);
    const wind = hours.map((h) => h.wind ?? 0);

    let startIdx = -1;
    if (best6h) {
      startIdx = hours.findIndex((h) => {
        const d = new Date(h.time);
        const hr = Number(d.toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2));
        return hr === best6h.start_hour;
      });
    }

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
        const step = Math.max(1, Math.round(hours.length / 12));
        hours.forEach((h, idx) => {
          if (idx % step !== 0) return;
          const x = xScale.getPixelForValue(idx);
          ctx.fillText(weatherEmoji(h.symbol), x, yArea.top - 12);
        });
        ctx.restore();
      },
    };

    const best6Plugin = {
      id: 'best6Box',
      beforeDatasetsDraw(chart) {
        if (startIdx < 0) return;
        const xScale = chart.scales.x;
        const yArea = chart.chartArea;
        const half = (xScale.getPixelForValue(1) - xScale.getPixelForValue(0)) / 2;
        const x1 = xScale.getPixelForValue(startIdx) - half;
        const x2 = xScale.getPixelForValue(Math.min(startIdx + 5, hours.length - 1)) + half;
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(138, 166, 81, 0.22)';
        ctx.fillRect(x1, yArea.top, x2 - x1, yArea.bottom - yArea.top);
        ctx.restore();
      },
    };

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      plugins: [best6Plugin, symbolPlugin],
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Nedbør',
            data: rain,
            backgroundColor: 'rgba(47, 123, 160, 0.75)',
            yAxisID: 'yRain',
            order: 2,
            barPercentage: 0.9,
            categoryPercentage: 0.9,
          },
          {
            type: 'line',
            label: 'Temperatur',
            data: temp,
            borderColor: 'rgba(178, 58, 44, 1)',
            backgroundColor: 'rgba(178, 58, 44, 0.08)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 3,
            yAxisID: 'yTemp',
            order: 1,
          },
          {
            type: 'line',
            label: 'Vind',
            data: wind,
            borderColor: 'rgba(92, 103, 112, 0.85)',
            borderWidth: 1.8,
            tension: 0.25,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 3,
            yAxisID: 'yWind',
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 22 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `kl. ${items[0].label}:00`,
              label: (ctx) => {
                if (ctx.dataset.label === 'Temperatur') return `Temp: ${ctx.parsed.y?.toFixed(1)}°`;
                if (ctx.dataset.label === 'Nedbør') return `Regn: ${ctx.parsed.y?.toFixed(1)} mm`;
                if (ctx.dataset.label === 'Vind') return `Vind: ${ctx.parsed.y?.toFixed(1)} m/s`;
                return '';
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 10 } } },
          yTemp: { position: 'left', grid: { color: 'rgba(20,23,26,0.06)' }, ticks: { font: { size: 10 }, callback: (v) => v + '°' } },
          yRain: { position: 'right', offset: true, grid: { display: false }, min: 0, suggestedMax: 2, ticks: { font: { size: 10 } } },
          yWind: { position: 'right', grid: { display: false }, min: 0, suggestedMax: 12, ticks: { font: { size: 10 }, callback: (v) => v + ' m/s' } },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [hours, best6h]);

  return <canvas ref={canvasRef} role="img" aria-label="Timesdetaljer for valgt dag" />;
};

export default WeatherDayChart;
