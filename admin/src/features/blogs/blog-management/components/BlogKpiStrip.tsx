import React from "react";
import { CheckCircle, Clock, Files, XCircle } from "@phosphor-icons/react";
import type { BlogStats } from "../../../../services/blog/handleBlog";
import type { BlogState } from "../../../../types/Blog";

interface BlogKpiStripProps {
  stats?: BlogStats;
  state?: BlogState;
  onSelect: (state?: BlogState) => void;
}

const DEFS: Array<{ state?: BlogState; label: string; Icon: typeof Files }> = [
  { state: undefined, label: "Tổng bài viết", Icon: Files },
  { state: "PENDING", label: "Chờ duyệt", Icon: Clock },
  { state: "APPROVED", label: "Đã duyệt", Icon: CheckCircle },
  { state: "REJECTED", label: "Từ chối", Icon: XCircle },
];

// Render a tiny bar sparkline from 14 daily counts (newer days are brighter).
const Sparkline: React.FC<{ counts: number[] }> = ({ counts }) => {
  const max = Math.max(1, ...counts);
  return (
    <svg width="56" height="22" viewBox="0 0 56 22" role="img" aria-label={`Bài viết tạo mới mỗi ngày trong 14 ngày: ${counts.join(", ")}`}>
      {counts.map((c, i) => {
        const h = c ? Math.max(4, (c / max) * 20) : 1.5;
        return (
          <rect key={i} x={i * 4} y={22 - h} width="3" height={h} rx="1" fill="currentColor" opacity={c ? (i > 6 ? 1 : 0.6) : 0.25} />
        );
      })}
    </svg>
  );
};

// Render the KPI cards that double as status filters, with 7-day trend and sparkline.
export const BlogKpiStrip: React.FC<BlogKpiStripProps> = ({ stats, state, onSelect }) => (
  <section className="kpis" aria-label="Tổng quan trạng thái">
    {DEFS.map(({ state: kpiState, label, Icon }) => {
      const bucket = stats?.[kpiState ?? "ALL"];
      return (
        <button
          key={label}
          type="button"
          data-state={kpiState ?? ""}
          aria-pressed={state === kpiState}
          onClick={() => onSelect(state === kpiState ? undefined : kpiState)}
          className={`kpi${state === kpiState ? " on" : ""}`}
        >
          <span className="kpi-h">
            <span>{label}</span>
            <Icon size={16} weight="light" />
          </span>
          <span className="kpi-v mono">{bucket?.count ?? "–"}</span>
          <span className="kpi-f">
            {bucket ? (
              <>
                <span>
                  <span className="mono">+{bucket.last7}</span> trong 7 ngày
                  <br />
                  trước đó <span className="mono">{bucket.prev7}</span>
                </span>
                <Sparkline counts={bucket.daily14} />
              </>
            ) : null}
          </span>
        </button>
      );
    })}
  </section>
);

export default BlogKpiStrip;
