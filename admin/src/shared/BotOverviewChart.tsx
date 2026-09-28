import React, { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  Tooltip,
  Filler,
  type ChartData,
  type ChartOptions,
  type ChartArea,
} from "chart.js";

ChartJS.register(LineElement, LinearScale, PointElement, CategoryScale, Tooltip, Filler);

interface BotOverviewChartProps {
  pnl_raw: Record<string, number>;
  pnl_after_fees: Record<string, number>;
  pnl_percent_raw: number[];
  pnl_percent_after_fees: number[];
  viewLabel: string;
}

const hexToRGB = (hex: string): string => {
  const match = hex.replace("#", "").match(/.{1,2}/g);
  if (!match) return "0, 0, 0";
  const [r, g, b] = match.map((x) => parseInt(x, 16));
  return `${r}, ${g}, ${b}`;
};

const createAdaptiveGradient = (
  ctx: CanvasRenderingContext2D,
  chartArea: ChartArea,
  yScale: { getPixelForValue: (value: number) => number },
  dataChart: number[],
  setGradient: React.Dispatch<React.SetStateAction<string | CanvasGradient>>,
) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  const yZero = yScale.getPixelForValue(0);
  const chartHeight = chartArea.bottom - chartArea.top;
  const zeroPosition = (chartArea.bottom - yZero) / chartHeight;

  const minValue = Math.min(...dataChart, 0);
  const maxValue = Math.max(...dataChart, 0);
  const hasNegative = minValue < 0;
  const hasPositive = maxValue > 0;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  if (hasNegative && zeroPosition > 0) {
    gradient.addColorStop(0, `rgba(${hexToRGB("#d22d3c")}, 0)`);
    gradient.addColorStop(clamp(Math.max(0, zeroPosition - 0.1)), `rgba(${hexToRGB("#d22d3c")}, 0.1)`);
    gradient.addColorStop(clamp(zeroPosition), `rgba(${hexToRGB("#d22d3c")}, 0.2)`);
  } else {
    gradient.addColorStop(0, `rgba(${hexToRGB("#00be73")}, 0)`);
  }

  if (zeroPosition > 0 && zeroPosition < 1) {
    gradient.addColorStop(zeroPosition, "rgba(0, 0, 0, 0)");
  }

  if (hasPositive && zeroPosition < 1) {
    gradient.addColorStop(clamp(zeroPosition), `rgba(${hexToRGB("#00be73")}, 0)`);
    gradient.addColorStop(clamp(Math.min(1, zeroPosition + 0.1)), `rgba(${hexToRGB("#00be73")}, 0.1)`);
    gradient.addColorStop(1, `rgba(${hexToRGB("#00be73")}, 0.2)`);
  } else if (!hasNegative) {
    gradient.addColorStop(0, `rgba(${hexToRGB("#00be73")}, 0)`);
    gradient.addColorStop(1, `rgba(${hexToRGB("#00be73")}, 0.2)`);
  }

  setGradient(gradient);
};

const roundBoundaryDown = (value: number, digits: number): number => {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.floor(value * factor) / factor;
};

const roundBoundaryUp = (value: number, digits: number): number => {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.ceil(value * factor) / factor;
};

const parseTickValue = (value: number | string): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const formatAxisValue = (value: number): string => {
  const decimals = Math.abs(value) < 1 ? 3 : 2;
  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

// Render a PnL chart with raw and after-fees lines.
const BotOverviewChart: React.FC<BotOverviewChartProps> = ({
  pnl_raw,
  pnl_after_fees,
  pnl_percent_raw,
  pnl_percent_after_fees,
  viewLabel,
}) => {
  const primaryGreen = "#22c55e";
  const pnlRawColor = "rgba(148,163,184,0.9)";
  const chartRef = useRef<ChartJS<"line">>(null);
  const [gradient, setGradient] = useState<string | CanvasGradient>("transparent");
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );

  const {
    labels,
    pnlRawValues,
    pnlAfterFeesValues,
    pnlPercentRawValues,
    pnlPercentAfterFeesValues,
    percentMin,
    percentMax,
    valueMin,
    valueMax,
  } = useMemo(() => {
    if (!pnl_raw || Object.keys(pnl_raw).length === 0) {
      return {
        labels: [] as string[],
        pnlRawValues: [] as number[],
        pnlAfterFeesValues: [] as number[],
        pnlPercentRawValues: [] as number[],
        pnlPercentAfterFeesValues: [] as number[],
        percentMin: -10,
        percentMax: 10,
        valueMin: -1,
        valueMax: 1,
      };
    }

    const sortedDates = Object.keys(pnl_raw).sort((a, b) => a.localeCompare(b));
    const pnlRawArr = sortedDates.map((d) => pnl_raw[d] ?? null);
    const pnlAfterFeesArr = sortedDates.map((d) => pnl_after_fees?.[d] ?? null);
    const len = sortedDates.length;
    const pnlPercentRawArr = (pnl_percent_raw || []).slice(0, len);
    const pnlPercentAfterFeesArr = (pnl_percent_after_fees || []).slice(0, len);

    const allValueNumbers = [...pnlRawArr, ...pnlAfterFeesArr].filter(
      (v): v is number => typeof v === "number" && !Number.isNaN(v),
    );
    const vMin = allValueNumbers.length ? Math.min(...allValueNumbers) : -1;
    const vMax = allValueNumbers.length ? Math.max(...allValueNumbers) : 1;

    const allPercents = [...pnlPercentRawArr, ...pnlPercentAfterFeesArr].filter(
      (v) => typeof v === "number" && !Number.isNaN(v),
    );

    let pMin = -10;
    let pMax = 10;

    if (allPercents.length) {
      pMin = Math.min(...allPercents);
      pMax = Math.max(...allPercents);
      if (pMin === pMax) {
        pMin -= 5;
        pMax += 5;
      }
    }

    return {
      labels: sortedDates,
      pnlRawValues: pnlRawArr,
      pnlAfterFeesValues: pnlAfterFeesArr,
      pnlPercentRawValues: pnlPercentRawArr,
      pnlPercentAfterFeesValues: pnlPercentAfterFeesArr,
      percentMin: roundBoundaryDown(pMin, 3),
      percentMax: roundBoundaryUp(pMax, 3),
      valueMin: roundBoundaryDown(vMin, 3),
      valueMax: roundBoundaryUp(vMax, 3),
    };
  }, [pnl_raw, pnl_after_fees, pnl_percent_raw, pnl_percent_after_fees]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const updateGradient = () => {
      const { ctx, chartArea } = chart;
      const yScale = chart.scales["value"];
      if (!ctx || !chartArea || !yScale) return;

      const numericAfterFees = pnlAfterFeesValues.filter(
        (v): v is number => typeof v === "number" && !Number.isNaN(v),
      );
      if (!numericAfterFees.length) {
        setGradient("transparent");
        return;
      }

      createAdaptiveGradient(ctx, chartArea, yScale, numericAfterFees, setGradient);
    };

    if (!chart.chartArea) {
      setTimeout(updateGradient, 50);
    } else {
      updateGradient();
    }
  }, [pnlAfterFeesValues, labels]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const data: ChartData<"line"> = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: `${viewLabel} raw`,
          data: pnlRawValues,
          yAxisID: "value",
          borderColor: pnlRawColor,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.25,
        },
        {
          label: `${viewLabel} after fees`,
          data: pnlAfterFeesValues,
          yAxisID: "value",
          borderColor: (ctx) => {
            const v = ctx.raw as number;
            return typeof v === "number" && v < 0 ? "#D22D3C" : primaryGreen;
          },
          backgroundColor: gradient || "rgba(34,197,94,0.15)",
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.25,
          segment: {
            borderColor: (ctx) => {
              const value = ctx.p1.parsed.y;
              return typeof value === "number" && value < 0 ? "#d22d3c" : "#00be73";
            },
          },
        },
      ],
    }),
    [labels, pnlRawValues, pnlAfterFeesValues, gradient, viewLabel],
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          usePointStyle: true,
          boxWidth: isMobile ? 5 : 6,
          boxHeight: isMobile ? 5 : 6,
          padding: isMobile ? 8 : 12,
          caretPadding: isMobile ? 12 : 16,
          caretSize: isMobile ? 4 : 6,
          xAlign: "center",
          yAlign: "bottom",
          titleFont: {
            size: isMobile ? 11 : 12,
            weight: 600,
          },
          bodyFont: {
            size: isMobile ? 11 : 12,
          },
          callbacks: {
            labelColor: (context) => {
              const value = context.parsed.y as number;
              const isRaw = context.datasetIndex === 0;
              const color = isRaw ? pnlRawColor : typeof value === "number" && value < 0 ? "#D22D3C" : primaryGreen;

              return {
                borderColor: color,
                backgroundColor: color,
                borderWidth: 0,
              };
            },
            labelPointStyle: () => ({
              pointStyle: "circle",
              rotation: 0,
            }),
            label: (context) => {
              const index = context.dataIndex;
              const datasetLabel = context.dataset.label || "";
              const value = context.parsed.y as number;
              const isRaw = context.datasetIndex === 0;
              const percent = isRaw ? pnlPercentRawValues[index] : pnlPercentAfterFeesValues[index];

              const formattedValue =
                typeof value === "number"
                  ? value.toLocaleString("vi-VN", {
                      maximumFractionDigits: 2,
                    })
                  : value;

              const formattedPercent =
                typeof percent === "number"
                  ? percent.toLocaleString("vi-VN", {
                      maximumFractionDigits: 2,
                    })
                  : null;

              if (formattedPercent !== null) {
                return ` ${formattedValue} (${formattedPercent}%)`;
              }

              return `${datasetLabel}: ${formattedValue}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#9ca3af",
            font: {
              size: isMobile ? 10 : 12,
            },
            autoSkip: false,
            maxTicksLimit: 15,
            callback: (_value, index) => {
              const i = index as number;
              const label = labels[i];
              if (!label) return "";
              const year = label.slice(0, 4);
              const prevLabel = labels[i - 1];
              const prevYear = prevLabel?.slice(0, 4);
              return year !== prevYear ? year : "";
            },
            stepSize: 1,
          },
          grid: {
            color: "rgba(255,255,255,0.05)",
          },
        },
        percent: {
          position: "left",
          ticks: {
            color: "#e5e7eb",
            font: {
              size: isMobile ? 10 : 12,
            },
            callback: (value) => {
              const parsedTickValue = parseTickValue(value);
              if (parsedTickValue === null) return "";
              return `${formatAxisValue(parsedTickValue)}%`;
            },
          },
          grid: {
            color: "rgba(255,255,255, 0.05)",
          },
          min: percentMin,
          max: percentMax,
        },
        value: {
          position: "right",
          ticks: {
            color: "#9ca3af",
            font: {
              size: isMobile ? 10 : 12,
            },
            callback: (value) => {
              const parsedTickValue = parseTickValue(value);
              if (parsedTickValue === null) return "";
              return formatAxisValue(parsedTickValue);
            },
          },
          grid: {
            drawOnChartArea: false,
          },
          min: valueMin,
          max: valueMax,
        },
      },
    }),
    [labels, percentMin, percentMax, valueMin, valueMax, pnlPercentRawValues, pnlPercentAfterFeesValues, isMobile],
  );

  if (labels.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-md border border-primary-white/20 bg-primary-black text-sm text-gray-400 backdrop-blur-sm">
        No chart data available.
      </div>
    );
  }

  const startLabel = labels[0];
  const endLabel = labels[labels.length - 1];

  return (
    <div className="w-full rounded-md border border-primary-white/20 p-0 backdrop-blur-sm md:p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary-white">{viewLabel}</h2>
      </div>

      <div className="h-[320px] w-full">
        <Line data={data} ref={chartRef} options={options} />
      </div>

      <div className="mt-4 flex flex-col gap-3 text-xs text-primary-white/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: pnlRawColor }} />
            <span>{viewLabel} raw</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: primaryGreen }} />
            <span>{viewLabel} after fees</span>
          </div>
        </div>

        <div className="text-right text-primary-white/50 sm:text-left">
          <span>
            Range{" "}
            <span className="text-primary-white">
              {startLabel} to {endLabel}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default BotOverviewChart;
