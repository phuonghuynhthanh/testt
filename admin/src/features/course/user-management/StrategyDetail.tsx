import { type ComponentType, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBarChart2,
  FiClock,
  FiDatabase,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";

import CourseMarkdownContent from "../../../shared/markdown-content/CourseMarkdownContent";
import BotOverviewChart from "../../../shared/BotOverviewChart";
import { getCourseUserPerformance } from "../../../services/user/handleUserManagement";
import CourseAdminAuthGate from "../components/CourseAdminAuthGate";
import PaperTradeLog from "./PaperTradeLog";
import type { CourseUserPerformanceResponse } from "../../../data/userManagementData";

interface CourseUserStrategyDetailContentProps {
  courseToken: string;
}

type PerformanceViewKey =
  | "historical"
  | "outsample"
  | "papertrading"
  | "total_data";

type PerformanceMetricSection =
  | CourseUserPerformanceResponse["historical"]
  | CourseUserPerformanceResponse["outsample"]
  | CourseUserPerformanceResponse["papertrading"]
  | CourseUserPerformanceResponse["total_data"]
  | CourseUserPerformanceResponse["historical"]["after_fees"];

type PerformanceEnvelopeSection = CourseUserPerformanceResponse["historical"];

interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  helper?: string;
}

interface MetricRowProps {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}

// Format numeric metrics for a compact admin panel display.
const formatMetricValue = (value?: number | null, suffix = "") => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const formattedValue = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

  return `${formattedValue}${suffix}`;
};

// Format ISO dates into a concise admin-friendly display.
const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

// Treat empty and PENDING values as jobs that have not run yet.
const hasCompletedRunTime = (value?: string) =>
  Boolean(value && value.trim().toUpperCase() !== "PENDING");

// Decide the visual tone for one metric value.
const getMetricTone = (value?: number | null): "positive" | "negative" | "neutral" => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "neutral";
  }
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
};

// Format a percentage-like field without forcing a percent sign.
const formatPercentValue = (value?: number | null) =>
  formatMetricValue(value, value === undefined || value === null ? "" : "%");

// Render one headline metric card.
const MetricCard = ({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  helper,
}: MetricCardProps) => (
  <div className="rounded-md border border-white/10 bg-primary-black-medium p-4">
    <div className="flex items-center gap-2 text-primary-white/55">
      <Icon className="text-base" />
      <p className="text-sm">{label}</p>
    </div>
    <p
      className={`mt-3 text-2xl font-semibold ${
        tone === "positive"
          ? "text-primary-green"
          : tone === "negative"
            ? "text-red-300"
            : "text-primary-white"
      }`}
    >
      {value}
    </p>
    {helper && <p className="mt-1 text-xs text-primary-white/45">{helper}</p>}
  </div>
);

// Render one compact key/value metric row.
const MetricRow = ({ label, value, tone = "neutral" }: MetricRowProps) => (
  <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3">
    <span className="text-sm text-primary-white/50">{label}</span>
    <span
      className={`text-sm font-semibold ${
        tone === "positive"
          ? "text-primary-green"
          : tone === "negative"
            ? "text-red-300"
            : "text-primary-white"
      }`}
    >
      {value}
    </span>
  </div>
);

// Select the strategy segment the admin wants to inspect.
const getSelectedSegment = (
  performance: CourseUserPerformanceResponse,
  view: PerformanceViewKey,
) : PerformanceMetricSection => {
  switch (view) {
    case "historical":
      return performance.historical;
    case "outsample":
      return performance.outsample;
    case "papertrading":
      return performance.papertrading;
    case "total_data":
    default:
      return performance.total_data;
  }
};

// Resolve a metric object from either an envelope section or a direct metric payload.
const resolveMetricSection = (
  section?: PerformanceMetricSection | null,
) => {
  if (!section) return null;
  if ("after_fees" in section) return section.after_fees ?? section.raw ?? null;
  return section;
};

// Resolve an envelope section for charting raw and after-fees series.
const resolveEnvelopeSection = (
  section?: PerformanceMetricSection | null,
): PerformanceEnvelopeSection | null => {
  if (!section || !("raw" in section) || !("after_fees" in section)) return null;
  return section;
};

// Render the dedicated strategy detail workspace.
const CourseUserStrategyDetailContent = ({
  courseToken,
}: CourseUserStrategyDetailContentProps) => {
  const navigate = useNavigate();
  const { userId = "", botId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const market = searchParams.get("market") || "VN_STOCK";
  const selectedView =
    (searchParams.get("view") as PerformanceViewKey | null) || "total_data";

  const performanceQuery = useQuery({
    queryKey: ["course-user-performance", courseToken, userId, botId, market],
    queryFn: () => getCourseUserPerformance(userId, botId, market, courseToken),
    enabled: Boolean(userId && botId),
  });

  const performance = performanceQuery.data || null;
  const [activeWorkspace, setActiveWorkspace] = useState<"chart" | "code">("chart");
  const segment = useMemo(
    () => (performance ? getSelectedSegment(performance, selectedView) : null),
    [performance, selectedView],
  );
  const envelopeSegment = resolveEnvelopeSection(segment);
  const selectedMetrics = resolveMetricSection(segment);
  const totalMetrics = resolveMetricSection(performance?.total_data);
  const selectedViewLabel =
    selectedView === "historical"
      ? "Historical"
      : selectedView === "outsample"
        ? "Out of sample"
        : selectedView === "papertrading"
          ? "Paper trading"
          : "Total data";
  const chartRaw = envelopeSegment?.raw?.pnl ?? {};
  const chartAfterFees = envelopeSegment?.after_fees?.pnl ?? {};
  const chartRawPercent = envelopeSegment?.raw?.pnl_percent ?? [];
  const chartAfterFeesPercent = envelopeSegment?.after_fees?.pnl_percent ?? [];

  const strategyCode = performance?.strategy_code?.trim() || "# Strategy code is not available.";
  const statusLabel = performance
    ? hasCompletedRunTime(performance.paper_trading_run_at)
      ? "PAPERTRADING"
      : hasCompletedRunTime(performance.run_at)
        ? "RUN TEST"
        : "CREATED"
    : "--";

  // Return to the parent user detail page.
  const handleBackToUser = () => {
    navigate(`/course/users/${userId}`);
  };

  const totalMetricRows = useMemo(() => {
    if (!totalMetrics) return [];

    return [
      {
        label: "Average return",
        value: formatMetricValue(totalMetrics.avg_return),
        tone: getMetricTone(totalMetrics.avg_return),
      },
      {
        label: "Average win",
        value: formatPercentValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).avg_win,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).avg_win,
        ),
      },
      {
        label: "Average loss",
        value: formatPercentValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).avg_loss,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).avg_loss,
        ),
      },
      {
        label: "Win rate",
        value: formatPercentValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).win_rate,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).win_rate,
        ),
      },
      {
        label: "Volatility",
        value: formatMetricValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).volatility,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).volatility,
        ),
      },
      {
        label: "Sharpe",
        value: formatMetricValue(totalMetrics.sharpe),
        tone: getMetricTone(totalMetrics.sharpe),
      },
      {
        label: "Sortino",
        value: formatMetricValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).sortino,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).sortino,
        ),
      },
      {
        label: "Calmar",
        value: formatMetricValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).calmar,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).calmar,
        ),
      },
      {
        label: "Profit factor",
        value: formatMetricValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).profit_factor,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).profit_factor,
        ),
      },
      {
        label: "Risk of ruin",
        value: formatPercentValue(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).risk_of_ruin,
        ),
        tone: getMetricTone(
          (totalMetrics as CourseUserPerformanceResponse["total_data"]["after_fees"]).risk_of_ruin,
        ),
      },
      {
        label: "Max drawdown",
        value: formatPercentValue(totalMetrics.max_drawdown),
        tone: getMetricTone(totalMetrics.max_drawdown),
      },
      {
        label: "Annual return",
        value: formatPercentValue(totalMetrics.annual_return),
        tone: getMetricTone(totalMetrics.annual_return),
      },
    ];
  }, [totalMetrics]);

  const detailMetricRows = useMemo(() => {
    if (!selectedMetrics) return [];
    return [
      { label: "Average return", value: formatMetricValue(selectedMetrics.avg_return), tone: getMetricTone(selectedMetrics.avg_return) },
      { label: "Max drawdown", value: formatPercentValue(selectedMetrics.max_drawdown), tone: getMetricTone(selectedMetrics.max_drawdown) },
      { label: "Sharpe", value: formatMetricValue(selectedMetrics.sharpe), tone: getMetricTone(selectedMetrics.sharpe) },
      { label: "Annual return", value: formatPercentValue(selectedMetrics.annual_return), tone: getMetricTone(selectedMetrics.annual_return) },
    ];
  }, [selectedMetrics]);

  const strategyCodeMarkdown = `\`\`\`python\n${strategyCode}\n\`\`\``;

  return (
    <div className="flex flex-col gap-6 pb-10 text-primary-white">
      <div className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <button
              type="button"
              className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-primary-white/75 transition hover:border-primary-green hover:text-primary-green"
              onClick={handleBackToUser}
            >
              <FiArrowLeft />
              Back to user detail
            </button>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
              Strategy Detail
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-primary-white md:text-4xl">
              {performance?.bot_name || "Loading strategy..."}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-primary-white/55">
              Performance breakdown, code source, and paper trading history for the selected strategy.
            </p>
          </div>
          <div className="flex w-fit flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 transition hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => performanceQuery.refetch()}
              disabled={performanceQuery.isFetching}
            >
              <FiRefreshCw
                className={performanceQuery.isFetching ? "animate-spin" : ""}
              />
              Refresh detail
            </button>
          </div>
        </div>
      </div>

      {performanceQuery.isLoading && (
        <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
          Loading strategy detail...
        </div>
      )}

      {!performanceQuery.isLoading && !performance && (
        <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
          Strategy detail is not available.
        </div>
      )}

      {performance && (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
            <div className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-green">
                    Strategy
                  </p>
                  <h2 className="mt-5 text-2xl font-semibold">
                    {performance.bot_name}
                  </h2>
                  <p className="mt-1 text-sm text-primary-white/55">
                    {performance.asset} - {performance.market} - {performance.creator_name}
                  </p>
                </div>
                <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
                  <MetricCard
                    icon={FiZap}
                    label="Status"
                    value={statusLabel}
                    helper="run state"
                  />
                  <MetricCard
                    icon={FiDatabase}
                    label="Market"
                    value={performance.market}
                    helper={performance.asset}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricCard
                  icon={FiClock}
                  label="Run at"
                  value={formatDateTime(performance.run_at)}
                  tone={hasCompletedRunTime(performance.run_at) ? "positive" : "neutral"}
                />
                <MetricCard
                  icon={FiClock}
                  label="Paper trading"
                  value={formatDateTime(performance.paper_trading_run_at)}
                  tone={hasCompletedRunTime(performance.paper_trading_run_at) ? "positive" : "neutral"}
                />
              </div>
            </div>

            <aside className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-green">
                  Summary
                </p>
                <h3 className="mt-2 text-xl font-semibold">Strategy Info</h3>
                <p className="mt-1 text-sm text-primary-white/45">
                  Metadata and current execution state
                </p>
              </div>
              <div className="mt-6 grid gap-2">
                <MetricRow
                  label="Created"
                  value={formatDateTime(performance.created_at)}
                />
                <MetricRow
                  label="Paper first order"
                  value={formatDateTime(performance.paper_trade_first_order)}
                  tone={hasCompletedRunTime(performance.paper_trade_first_order) ? "positive" : "neutral"}
                />
              </div>
            </aside>
          </section>

          <section className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Performance Workspace</h2>
                <p className="mt-1 text-sm text-primary-white/50">
                  Switch between chart and strategy code without squeezing the layout.
                </p>
              </div>
              <div className="inline-flex w-fit rounded-md border border-white/10 bg-primary-black-medium p-1">
                {(["chart", "code"] as const).map((mode) => {
                  const isActive = activeWorkspace === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setActiveWorkspace(mode)}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-primary-green text-primary-black"
                          : "text-primary-white/70 hover:text-primary-white"
                      }`}
                    >
                      {mode === "chart" ? "Chart" : "Code"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {(["historical", "outsample", "papertrading", "total_data"] as const).map((view) => {
                const isActive = selectedView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-primary-green bg-primary-green text-primary-black"
                        : "border-white/10 text-primary-white/70 hover:border-primary-green hover:text-primary-green"
                    }`}
                    onClick={() =>
                      navigate(
                        `/course/users/${userId}/strategies/${botId}?market=${encodeURIComponent(
                          market,
                        )}&view=${view}`,
                      )
                    }
                  >
                    {view === "total_data"
                      ? "Total data"
                      : view === "papertrading"
                        ? "Paper trading"
                        : view}
                  </button>
                );
              })}
            </div>

            {activeWorkspace === "chart" ? (
              <div className="mt-5">
                <div className="rounded-md border border-white/10 bg-primary-black-medium p-3">
                  <BotOverviewChart
                    pnl_raw={chartRaw}
                    pnl_after_fees={chartAfterFees}
                    pnl_percent_raw={chartRawPercent}
                    pnl_percent_after_fees={chartAfterFeesPercent}
                    viewLabel={selectedViewLabel}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {detailMetricRows.map((metric) => (
                    <MetricCard
                      key={metric.label}
                      icon={FiBarChart2}
                      label={metric.label}
                      value={metric.value}
                      tone={metric.tone}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-md border border-white/10 bg-primary-black-medium">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-medium text-primary-white/60">Strategy Code</p>
                  <p className="mt-1 text-sm text-primary-white/45">
                    Source code returned by the admin performance API.
                  </p>
                </div>
                <CourseMarkdownContent
                  content={strategyCodeMarkdown}
                  enableMarkdownStyles={false}
                  enableCopyCode
                />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Total Data Metrics</h2>
                <p className="mt-1 text-sm text-primary-white/50">
                  Detailed breakdown for the selected backtest envelope.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {totalMetricRows.map((metric) => (
                <MetricCard
                  key={metric.label}
                  icon={FiBarChart2}
                  label={metric.label}
                  value={metric.value}
                  tone={metric.tone}
                />
              ))}
            </div>
          </section>

          <PaperTradeLog
            botName={performance.bot_name}
            dataHistoryPaperTrade={performance.history_paper_trading}
            isLoading={false}
          />
        </>
      )}
    </div>
  );
};

// Wrap strategy detail with the dedicated course-admin auth popup.
const CourseUserStrategyDetail = () => (
  <CourseAdminAuthGate>
    {(courseToken) => (
      <CourseUserStrategyDetailContent courseToken={courseToken} />
    )}
  </CourseAdminAuthGate>
);

export default CourseUserStrategyDetail;
