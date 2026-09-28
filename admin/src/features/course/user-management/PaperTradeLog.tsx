import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { TiArrowSortedDown, TiArrowSortedUp } from "react-icons/ti";

import type { CourseUserPerformanceResponse } from "../../../data/userManagementData";

interface PaperTradeLogProps {
  botName: string;
  dataHistoryPaperTrade: CourseUserPerformanceResponse["history_paper_trading"];
  isLoading: boolean;
}

type TradeRecord = CourseUserPerformanceResponse["history_paper_trading"][number] & {
  size: number;
};

// Format a UTC/local timestamp into a compact table-friendly string.
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

// Build a CSV string with escaped values for download.
const buildCsvContent = (rows: TradeRecord[]) => {
  const headers = ["Price Close", "Size", "Position Diff", "Position", "Time"];
  const escapeCsvValue = (value: string | number) => {
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  };

  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      [
        row.price_close,
        row.size,
        row.position_diff,
        row.position,
        row.time,
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ];

  return lines.join("\n");
};

// Render the paper trading history table with filters, sorting, pagination, and export.
const PaperTradeLog = ({ botName, dataHistoryPaperTrade, isLoading }: PaperTradeLogProps) => {
  const parseTime = (timeString: string) => new Date(timeString).getTime();
  const [selectedFilterDate, setSelectedFilterDate] = useState("");
  const [selectedFilterPosition, setSelectedFilterPosition] = useState<"all" | "buy" | "sell">("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const enrichedData: TradeRecord[] = useMemo(() => {
    return dataHistoryPaperTrade.map((item) => ({
      ...item,
      size: Math.abs(item.position_diff),
    }));
  }, [dataHistoryPaperTrade]);

  const filteredData = useMemo(() => {
    return enrichedData.filter((item) => {
      if (item.size === 0) return false;

      const [itemDate] = item.time.split(" ");
      const isDateMatch = selectedFilterDate ? itemDate === selectedFilterDate : true;
      const isPositionMatch =
        selectedFilterPosition === "all"
          ? true
          : selectedFilterPosition === "buy"
            ? item.position_diff > 0
            : item.position_diff < 0;

      return isDateMatch && isPositionMatch;
    });
  }, [enrichedData, selectedFilterDate, selectedFilterPosition]);

  // Keep pagination stable when filters or sort order change.
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilterDate, selectedFilterPosition, sortDirection]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) =>
      sortDirection === "asc" ? parseTime(a.time) - parseTime(b.time) : parseTime(b.time) - parseTime(a.time),
    );
  }, [filteredData, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedRows = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, sortedData.length);

  // Trigger a browser download for the current filtered dataset.
  const handleExportCsv = () => {
    const csvContent = buildCsvContent(sortedData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${botName}-paper-trading-log.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const renderSortIcon = () =>
    sortDirection === "asc" ? (
      <TiArrowSortedUp className="h-4 w-auto shrink-0" />
    ) : (
      <TiArrowSortedDown className="h-4 w-auto shrink-0" />
    );

  const gridCols =
    "grid w-full grid-cols-[minmax(120px,1.2fr)_minmax(100px,0.8fr)_minmax(110px,1fr)_minmax(150px,1fr)_minmax(170px,0.8fr)]";

  return (
    <div className="rounded-md border border-primary-white/20 bg-primary-black/80 p-5 backdrop-blur-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-white">Paper Trading History</h2>
          <p className="mt-1 text-sm text-primary-white/50">
            Raw paper trading log returned by the admin performance API.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-sm text-primary-white">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-primary-white/60">Date</span>
            <input
              type="date"
              style={{ colorScheme: "dark" }}
              className="h-9 rounded-md border border-primary-white/15 bg-primary-black px-2 text-sm text-primary-white outline-none focus:border-primary-white/40"
              value={selectedFilterDate}
              onChange={(e) => setSelectedFilterDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-primary-white/60">Position type</span>
            <select
              value={selectedFilterPosition}
              onChange={(e) => setSelectedFilterPosition(e.target.value as "all" | "buy" | "sell")}
              className="h-9 rounded-md border border-primary-white/15 bg-primary-black px-2 text-sm text-primary-white outline-none focus:border-primary-white/40"
            >
              <option value="all">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-primary-white/60">Export</span>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-9 items-center rounded-md border border-primary-white/15 px-3 text-sm text-primary-white transition hover:border-primary-green hover:text-primary-green"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[600px] overflow-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-primary-white/55">
            Loading paper trading history...
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-primary-white/50">
            No paper trading history available.
          </div>
        ) : (
          <div className="w-full min-w-[650px]">
            <div className={`${gridCols} sticky top-0 z-10 border-b border-white/10 bg-primary-black/60 backdrop-blur-lg`}>
              <div className="px-4 py-2.5 text-left text-sm font-medium text-primary-white/70">Price Close</div>
              <div className="px-4 py-2.5 text-left text-sm font-medium text-primary-white/70">Size</div>
              <div className="px-4 py-2.5 text-left text-sm font-medium text-primary-white/70">Position Diff</div>
              <div className="px-4 py-2.5 text-left text-sm font-medium text-primary-white/70">Position</div>
              <div className="px-4 py-2.5 text-left text-sm font-medium text-primary-white/70">
                <button onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))} className="flex items-center gap-1">
                  Time
                  {renderSortIcon()}
                </button>
              </div>
            </div>

            {paginatedRows.map((item) => (
              <div
                key={`${item.time}-${item.price_close}-${item.position_diff}`}
                className={`${gridCols} items-center border-b border-white/5 text-sm hover:bg-white/5`}
              >
                <div className="px-4 py-2.5 text-sm whitespace-nowrap text-primary-white">{item.price_close}</div>
                <div className="px-4 py-2.5 text-sm whitespace-nowrap text-primary-white">{item.size.toLocaleString()}</div>
                <div className="flex items-center px-4 py-3">
                  <div
                    className={`rounded-md px-2 py-[2px] text-center text-[11px] font-extrabold ${
                      item.position_diff === 0
                        ? "border border-white/20 bg-white/5 text-neutral-400"
                        : item.position_diff > 0
                          ? "border border-primary-green bg-primary-green-dark text-primary-white"
                          : "border border-primary-red-dark bg-primary-red-dark text-primary-white"
                    }`}
                  >
                    {item.position_diff === 0 ? "Hold" : item.position_diff > 0 ? "Buy" : "Sell"}
                  </div>
                </div>
                <div className="flex items-center px-4 py-3">
                  <div
                    className={`w-9 rounded-md bg-white/10 py-[2px] text-center font-bold ${
                      item.position > 0
                        ? "text-primary-green-dark"
                        : item.position < 0
                          ? "text-primary-red-dark"
                          : "text-primary-white"
                    }`}
                  >
                    {item.position}
                  </div>
                </div>
                <div className="px-4 py-2.5 text-sm whitespace-nowrap text-primary-white/80">{formatDateTime(item.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sortedData.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-primary-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
          <p className="text-xs text-primary-white/60 sm:text-sm">
            {startItem}-{endItem} / {sortedData.length}
          </p>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-white/10 px-3 py-2 text-xs font-semibold text-primary-white transition hover:border-primary-white/20 hover:bg-primary-white/5 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              <FiChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="min-w-[72px] text-center text-xs font-semibold text-primary-white/70 sm:text-sm">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-white/10 px-3 py-2 text-xs font-semibold text-primary-white transition hover:border-primary-white/20 hover:bg-primary-white/5 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              Next
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperTradeLog;
