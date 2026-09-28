import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiArrowUpRight, FiDownload, FiRefreshCw } from "react-icons/fi";

import type {
  CourseUserProfile,
  CourseUserStrategy,
} from "../../../data/userManagementData";
import { getCourseUserProfile } from "../../../services/user/handleUserManagement";
import CourseAdminAuthGate from "../components/CourseAdminAuthGate";

interface CourseUserManagementDetailContentProps {
  courseToken: string;
}

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

// Normalize a value for CSV output.
const escapeCsvValue = (value: string | number | boolean | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

// Treat empty and PENDING values as jobs that have not run yet.
const hasCompletedRunTime = (value?: string) =>
  Boolean(value && value.trim().toUpperCase() !== "PENDING");

// Download the current detail payload as a CSV file.
const downloadCsv = (
  profile: CourseUserProfile,
  strategies: CourseUserStrategy[],
) => {
  const header = [
    "user_id",
    "name",
    "email",
    "bot_id",
    "bot_name",
    "market",
    "asset",
    "asset_type",
    "is_paper_trading",
    "created_at",
    "run_at",
    "paper_trading_run_at",
    "paper_trade_first_order",
  ];

  const rows = strategies.length
    ? strategies.map((strategy) =>
        [
          profile.user_id,
          profile.name,
          profile.email,
          strategy.bot_id,
          strategy.bot_name,
          strategy.market,
          strategy.asset,
          strategy.asset_type,
          strategy.is_paper_trading,
          strategy.created_at,
          strategy.run_at,
          strategy.paper_trading_run_at,
          strategy.paper_trade_first_order,
        ]
          .map(escapeCsvValue)
          .join(","),
      )
    : [
        [
          profile.user_id,
          profile.name,
          profile.email,
          "",
          "",
          "",
          "",
          "",
          false,
          profile.created_at,
          "",
          "",
          "",
        ]
          .map(escapeCsvValue)
          .join(","),
      ];

  const csvContent = [header.join(","), ...rows].join("\n");
  const blob = new Blob([`\ufeff${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${profile.user_id}-strategies.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

// Render one strategy row in the user detail table.
const CourseUserStrategyRow = ({
  strategy,
  onViewDetail,
}: {
  strategy: CourseUserStrategy;
  onViewDetail: (botId: string, market: string) => void;
}) => {
  const statusLabel = hasCompletedRunTime(strategy.paper_trading_run_at)
    ? "PAPERTRADING"
    : hasCompletedRunTime(strategy.run_at)
      ? "RUN TEST"
      : "CREATED";

  return (
    <tr className="border-b border-white/10 transition duration-200 hover:bg-primary-green/5">
      <td className="px-4 py-5">
        <p className="font-semibold text-primary-white">{strategy.bot_name}</p>
        <p className="mt-1 text-xs text-primary-white/50">{strategy.bot_id}</p>
      </td>
      <td className="px-4 py-5 text-primary-white/70">{strategy.market}</td>
      <td className="px-4 py-5 text-primary-white/70">{strategy.asset}</td>
      <td className="px-4 py-5">
        <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-semibold text-primary-white/80">
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-5 text-primary-white/70">
        {formatDateTime(strategy.paper_trading_run_at)}
      </td>
      <td className="px-4 py-5 text-primary-white/70">
        {formatDateTime(strategy.created_at)}
      </td>
      <td className="px-4 py-5">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm text-primary-white/75 transition hover:border-primary-green hover:text-primary-green"
          onClick={() => onViewDetail(strategy.bot_id, strategy.market)}
        >
          Detail
          <FiArrowUpRight />
        </button>
      </td>
    </tr>
  );
};

// Render the dedicated user detail workspace.
const CourseUserManagementDetailContent = ({
  courseToken,
}: CourseUserManagementDetailContentProps) => {
  const navigate = useNavigate();
  const { userId = "" } = useParams();

  const userQuery = useQuery({
    queryKey: ["course-user-profile", courseToken, userId],
    queryFn: () => getCourseUserProfile(userId, courseToken),
    enabled: !!userId,
  });

  const user = userQuery.data || null;

  // Derive simple summary values from the loaded strategy list.
  const summary = useMemo(() => {
    const strategies = user?.strategies || [];
    return {
      totalStrategies: strategies.length,
      paperTradingStrategies: strategies.filter(
        (strategy) => strategy.is_paper_trading,
      ).length,
      latestPaperTradingTime: strategies
        .map((strategy) => strategy.paper_trading_run_at)
        .filter(Boolean)
        .sort(
          (first, second) =>
            new Date(second).getTime() - new Date(first).getTime(),
        )[0],
    };
  }, [user?.strategies]);

  // Return to the user list.
  const handleBackToUsers = () => {
    navigate("/course/users");
  };

  // Export the current user strategy data as CSV.
  const handleExportCsv = () => {
    if (!user) return;
    downloadCsv(user, user.strategies || []);
  };

  // Open the dedicated strategy detail page for one row.
  const handleViewStrategyDetail = (botId: string, market: string) => {
    navigate(
      `/course/users/${userId}/strategies/${botId}?market=${encodeURIComponent(market)}`,
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-10 text-primary-white">
      <div className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <button
              type="button"
              className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-primary-white/75 transition hover:border-primary-green hover:text-primary-green"
              onClick={handleBackToUsers}
            >
              <FiArrowLeft />
              Back to users
            </button>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
              User Detail
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-primary-white md:text-4xl">
              {user?.name || "Loading user..."}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-primary-white/55">
              Strategy list, paper trading time, and account information for the
              selected QuantVN user.
            </p>
          </div>
          <div className="flex w-fit flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 transition hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => userQuery.refetch()}
              disabled={userQuery.isFetching}
            >
              <FiRefreshCw
                className={userQuery.isFetching ? "animate-spin" : ""}
              />
              Refresh detail
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-primary-green/60 px-4 py-2 text-sm font-semibold text-primary-green transition hover:bg-primary-green hover:text-primary-black disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleExportCsv}
              disabled={!user || userQuery.isFetching}
            >
              <FiDownload />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {userQuery.isLoading && (
        <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
          Loading user detail...
        </div>
      )}

      {!userQuery.isLoading && !user && (
        <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
          User detail is not available.
        </div>
      )}

      {user && (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <div className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
              <div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-green">
                    Profile
                  </p>
                  <h2 className="mt-5 text-2xl font-semibold">{user.name}</h2>
                  <p className="mt-1 text-sm text-primary-white/55">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-white/10 bg-primary-black-medium p-4">
                  <p className="text-sm text-primary-white/50">Plan</p>
                  <p className="mt-2 font-semibold">{user.subscription_plan}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-primary-black-medium p-4">
                  <p className="text-sm text-primary-white/50">Package</p>
                  <p className="mt-2 font-semibold">
                    {user.subscription_package}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-primary-black-medium p-4">
                  <p className="text-sm text-primary-white/50">Strategies</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {summary.totalStrategies}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-primary-black-medium p-4">
                  <p className="text-sm text-primary-white/50">
                    Paper trading
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {summary.paperTradingStrategies}
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-green">
                  Account
                </p>
                <h3 className="mt-2 text-xl font-semibold">User Info</h3>
                <p className="mt-1 text-sm text-primary-white/45">
                  Account data
                </p>
              </div>
              <div className="mt-6 grid gap-4 text-sm">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-primary-white/50">User ID</span>
                  <span className="text-right">{user.user_id}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-primary-white/50">Created</span>
                  <span className="text-right">
                    {formatDateTime(user.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-white/50">Updated</span>
                  <span className="text-right">
                    {formatDateTime(user.updated_at)}
                  </span>
                </div>
              </div>

             
            </aside>
          </section>

          <section className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Strategies</h2>
                <p className="mt-1 text-sm text-primary-white/50">
                  View strategy status and paper trading time for this user.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[920px] table-auto text-left text-sm">
                <thead className="bg-primary-black-medium text-primary-white">
                  <tr>
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                      Strategy
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                      Market
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                      Asset
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                      Status
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                      Paper Trading
                    </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                    Created
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {user.strategies.map((strategy) => (
                  <CourseUserStrategyRow
                    key={strategy.bot_id}
                    strategy={strategy}
                    onViewDetail={handleViewStrategyDetail}
                  />
                ))}
              </tbody>
              </table>
              {user.strategies.length === 0 && (
                <div className="p-8 text-center text-sm text-primary-white/55">
                  No strategies found for this user.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

// Wrap user detail with the dedicated course-admin auth popup.
const CourseUserManagementDetail = () => (
  <CourseAdminAuthGate>
    {(courseToken) => (
      <CourseUserManagementDetailContent courseToken={courseToken} />
    )}
  </CourseAdminAuthGate>
);

export default CourseUserManagementDetail;
