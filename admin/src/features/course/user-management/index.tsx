import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowUpRight,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

import type { CourseUser, SubscriptionPackage } from "../../../data/courseData";
import {
  getCourseUsers,
  updateCourseUserSubscription,
} from "../../../services/course/handleCourse";
import CourseAdminAuthGate from "../components/CourseAdminAuthGate";

const PACKAGE_OPTIONS: SubscriptionPackage[] = ["SILVER", "GOLD", "PLATINUM"];
type PackageFilter = SubscriptionPackage | "ALL" | "NONE";
type UserSortKey = "user" | "phone" | "package" | "registration" | "lastLogin";
type SortDirection = "asc" | "desc";

interface SortState {
  key: UserSortKey;
  direction: SortDirection;
}

interface CourseUserManagementContentProps {
  courseToken: string;
}

interface CourseUserRowProps {
  user: CourseUser;
  draftPackage: SubscriptionPackage | "";
  draftRegistrationDate: string;
  isUpdating: boolean;
  onPackageDraftChange: (
    userId: string,
    subscriptionPackage: SubscriptionPackage,
  ) => void;
  onRegistrationDateDraftChange: (
    userId: string,
    registrationDate: string,
  ) => void;
  onApply: (user: CourseUser) => void;
  onViewDetail: (userId: string) => void;
}

interface SortableTableHeaderProps {
  label: string;
  sortKey: UserSortKey;
  sortState: SortState;
  onSort: (sortKey: UserSortKey) => void;
}

// Pad date and time parts for backend-compatible date strings.
const padDatePart = (value: number) => String(value).padStart(2, "0");

// Format ISO dates defensively for incomplete API payloads.
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

// Convert a backend date string into the datetime-local input format.
const toDateTimeLocalInputValue = (value?: string | null) => {
  if (!value) return "";
  const normalizedValue = value.trim();
  const backendDateMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/,
  );
  if (backendDateMatch) {
    const [, year, month, day, hours, minutes] = backendDateMatch;
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return (
    [
      parsedDate.getFullYear(),
      padDatePart(parsedDate.getMonth() + 1),
      padDatePart(parsedDate.getDate()),
    ].join("-") +
    `T${padDatePart(parsedDate.getHours())}:${padDatePart(parsedDate.getMinutes())}`
  );
};

// Convert a datetime-local input value into the backend registration_date format.
const formatRegistrationDateForPayload = (value: string) => {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [hours = "00", minutes = "00"] = timePart.split(":");
  return `${datePart} ${hours}:${minutes}:00`;
};

// Format current local time for backend registration_date payload.
const formatCurrentRegistrationDate = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = padDatePart(currentDate.getMonth() + 1);
  const day = padDatePart(currentDate.getDate());
  const hours = padDatePart(currentDate.getHours());
  const minutes = padDatePart(currentDate.getMinutes());
  const seconds = padDatePart(currentDate.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Resolve the best available display name for a user row.
const getUserDisplayName = (user: CourseUser) =>
  user.full_name || user.display_name || user.email || user.id;

// Convert nullable strings into stable lowercase values for sorting.
const normalizeSortText = (value?: string | null) =>
  (value || "").trim().toLowerCase();

// Convert date strings into timestamps while pushing empty dates to the bottom.
const getSortDateValue = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsedTime = new Date(value).getTime();
  return Number.isNaN(parsedTime) ? Number.POSITIVE_INFINITY : parsedTime;
};

// Resolve the comparable value for one sortable user column.
const getUserSortValue = (user: CourseUser, sortKey: UserSortKey) => {
  switch (sortKey) {
    case "user":
      return normalizeSortText(getUserDisplayName(user));
    case "phone":
      return normalizeSortText(user.phone);
    case "package":
      return normalizeSortText(user.subscription_package);
    case "registration":
      return getSortDateValue(user.registration_date);
    case "lastLogin":
      return getSortDateValue(user.last_login);
    default:
      return "";
  }
};

// Compare two user rows using the current table sort state.
const compareUsersBySortState = (
  firstUser: CourseUser,
  secondUser: CourseUser,
  sortState: SortState,
) => {
  const firstValue = getUserSortValue(firstUser, sortState.key);
  const secondValue = getUserSortValue(secondUser, sortState.key);
  const sortMultiplier = sortState.direction === "asc" ? 1 : -1;

  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return (firstValue - secondValue) * sortMultiplier;
  }

  return String(firstValue).localeCompare(String(secondValue)) * sortMultiplier;
};

// Render one clickable table header with current sort direction.
const SortableTableHeader = ({
  label,
  sortKey,
  sortState,
  onSort,
}: SortableTableHeaderProps) => {
  const isActive = sortState.key === sortKey;
  const SortIcon =
    isActive && sortState.direction === "desc" ? FiChevronDown : FiChevronUp;

  return (
    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-left uppercase tracking-[0.12em] transition hover:text-primary-green"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <SortIcon
          className={`text-sm transition ${
            isActive ? "text-primary-green" : "text-primary-white/25"
          }`}
        />
      </button>
    </th>
  );
};

// Render one editable user row in the subscription package table.
const CourseUserRow = ({
  user,
  draftPackage,
  draftRegistrationDate,
  isUpdating,
  onPackageDraftChange,
  onRegistrationDateDraftChange,
  onApply,
  onViewDetail,
}: CourseUserRowProps) => {
  const hasPackageChange =
    Boolean(draftPackage) &&
    draftPackage !== (user.subscription_package || "");
  const hasRegistrationDateChange =
    Boolean(user.registration_date) &&
    Boolean(draftRegistrationDate) &&
    draftRegistrationDate !== toDateTimeLocalInputValue(user.registration_date);
  const canApplyChange =
    Boolean(draftPackage) && (hasPackageChange || hasRegistrationDateChange);

  return (
    <tr className="border-b border-white/10 transition duration-200 hover:bg-primary-green/5">
      <td className="px-4 py-5">
        <p className="font-semibold text-primary-white">
          {getUserDisplayName(user)}
        </p>
        <p className="mt-1 text-xs text-primary-white/50">
          {user.email || user.id}
        </p>
      </td>
      <td className="px-4 py-5 text-primary-white/70">
        {user.phone || "--"}
      </td>
      <td className="px-4 py-5">
        <select
          className="min-w-40 rounded-md border border-white/20 bg-primary-black-medium px-3 py-2 text-sm text-primary-white outline-none transition focus:border-primary-green disabled:cursor-not-allowed disabled:opacity-50"
          value={draftPackage}
          disabled={isUpdating}
          onChange={(event) =>
            onPackageDraftChange(
              user.id,
              event.target.value as SubscriptionPackage,
            )
          }
        >
          <option value="" disabled>
            Select package
          </option>
          {PACKAGE_OPTIONS.map((subscriptionPackage) => (
            <option key={subscriptionPackage} value={subscriptionPackage}>
              {subscriptionPackage}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-5 text-primary-white/70">
        {user.registration_date ? (
          <input
            type="datetime-local"
            className="min-w-48 rounded-md border border-white/20 bg-primary-black-medium px-3 py-2 text-sm text-primary-white outline-none transition focus:border-primary-green disabled:cursor-not-allowed disabled:opacity-50"
            value={draftRegistrationDate}
            disabled={isUpdating}
            onChange={(event) =>
              onRegistrationDateDraftChange(user.id, event.target.value)
            }
          />
        ) : (
          "--"
        )}
      </td>
      <td className="px-4 py-5 text-primary-white/70">
        {formatDateTime(user.last_login)}
      </td>
      <td className="px-4 py-5">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-md border border-primary-green/60 px-4 py-2 text-sm font-semibold text-primary-green transition hover:bg-primary-green hover:text-primary-black disabled:cursor-not-allowed disabled:border-white/20 disabled:text-primary-white/35 disabled:hover:bg-transparent"
            disabled={!canApplyChange || isUpdating}
            onClick={() => onApply(user)}
          >
            {isUpdating ? "Applying..." : "Apply"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/75 transition hover:border-primary-green hover:text-primary-green"
            onClick={() => onViewDetail(user.id)}
          >
            Detail
            <FiArrowUpRight />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Render the user list and subscription package assignment workflow.
const CourseUserManagementContent = ({
  courseToken,
}: CourseUserManagementContentProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [packageFilter, setPackageFilter] = useState<PackageFilter>("ALL");
  const [sortState, setSortState] = useState<SortState>({
    key: "user",
    direction: "asc",
  });
  const [draftPackages, setDraftPackages] = useState<
    Record<string, SubscriptionPackage | "">
  >({});
  const [draftRegistrationDates, setDraftRegistrationDates] = useState<
    Record<string, string>
  >({});

  const usersQuery = useQuery({
    queryKey: ["course-users", courseToken],
    queryFn: () => getCourseUsers(courseToken),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      subscriptionPackage,
      registrationDate,
    }: {
      userId: string;
      subscriptionPackage: SubscriptionPackage;
      registrationDate: string;
    }) =>
      updateCourseUserSubscription(
        {
          user_id: userId,
          subscription_package: subscriptionPackage,
          registration_date: registrationDate,
        },
        courseToken,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["course-users", courseToken],
      });
      toast.success("Subscription package updated.");
    },
    onError: () => {
      toast.error("Unable to update subscription package.");
    },
  });

  // Filter users by package state and the current search keyword.
  const filteredUsers = useMemo(() => {
    const users = usersQuery.data ?? [];
    const normalizedKeyword = keyword.trim().toLowerCase();
    return users.filter((user) => {
      const matchesPackage =
        packageFilter === "ALL" ||
        (packageFilter === "NONE"
          ? !user.subscription_package
          : user.subscription_package === packageFilter);
      if (!matchesPackage) return false;
      if (!normalizedKeyword) return true;

      const searchableText = [
        user.id,
        user.email,
        user.full_name,
        user.display_name,
        user.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(normalizedKeyword);
    });
  }, [keyword, packageFilter, usersQuery.data]);

  // Sort the filtered user list by the selected table column.
  const sortedUsers = useMemo(
    () =>
      [...filteredUsers].sort((firstUser, secondUser) =>
        compareUsersBySortState(firstUser, secondUser, sortState),
      ),
    [filteredUsers, sortState],
  );

  // Resolve current draft package for a row, falling back to backend value.
  const getDraftPackage = (user: CourseUser) =>
    draftPackages[user.id] ?? user.subscription_package ?? "";

  // Resolve current draft registration date for a row, falling back to backend value.
  const getDraftRegistrationDate = (user: CourseUser) =>
    draftRegistrationDates[user.id] ??
    toDateTimeLocalInputValue(user.registration_date);

  // Store package edits locally until admin explicitly applies the row.
  const handlePackageDraftChange = (
    userId: string,
    subscriptionPackage: SubscriptionPackage,
  ) => {
    setDraftPackages((currentDrafts) => ({
      ...currentDrafts,
      [userId]: subscriptionPackage,
    }));
  };

  // Store registration date edits locally until admin explicitly applies the row.
  const handleRegistrationDateDraftChange = (
    userId: string,
    registrationDate: string,
  ) => {
    setDraftRegistrationDates((currentDrafts) => ({
      ...currentDrafts,
      [userId]: registrationDate,
    }));
  };

  // Toggle sort direction when clicking the active column, otherwise sort ascending.
  const handleSortChange = (sortKey: UserSortKey) => {
    setSortState((currentSortState) => {
      if (currentSortState.key !== sortKey) {
        return { key: sortKey, direction: "asc" };
      }

      return {
        key: sortKey,
        direction: currentSortState.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  // Submit one pending package change for a user row.
  const handleApplyPackage = (user: CourseUser) => {
    const nextPackage = getDraftPackage(user);
    if (!nextPackage) return;

    const nextRegistrationDate = getDraftRegistrationDate(user);

    updateMutation.mutate(
      {
        userId: user.id,
        subscriptionPackage: nextPackage,
        registrationDate: nextRegistrationDate
          ? formatRegistrationDateForPayload(nextRegistrationDate)
          : formatCurrentRegistrationDate(),
      },
      {
        onSuccess: () => {
          setDraftPackages((currentDrafts) => {
            const nextDrafts = { ...currentDrafts };
            delete nextDrafts[user.id];
            return nextDrafts;
          });
          setDraftRegistrationDates((currentDrafts) => {
            const nextDrafts = { ...currentDrafts };
            delete nextDrafts[user.id];
            return nextDrafts;
          });
        },
      },
    );
  };

  // Open the dedicated user detail page for one row.
  const handleViewDetail = (userId: string) => {
    navigate(`/course/users/${userId}`);
  };

  return (
    <div className="flex flex-col gap-6 pb-10 text-primary-white">
      <div className="rounded-lg border border-white/10 bg-primary-black-light px-6 py-7 md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
              Course Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-primary-white">
              User Packages
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-primary-white/55">
              View users and assign course subscription packages through the
              backend course admin API.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 transition hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <FiRefreshCw
              className={usersQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh users
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="mt-1 text-sm text-primary-white/50">
              Change a package locally, then apply the row to update backend.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-64 items-center gap-2 rounded-md border border-white/20 bg-primary-black-medium px-3 py-3 text-primary-white focus-within:border-primary-green">
              <FiSearch className="shrink-0 text-primary-white/55" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-primary-white/35"
                value={keyword}
                placeholder="Search user"
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            <select
              className="rounded-md border border-white/20 bg-primary-black-medium px-3 py-3 text-sm text-primary-white outline-none transition focus:border-primary-green"
              value={packageFilter}
              onChange={(event) =>
                setPackageFilter(event.target.value as PackageFilter)
              }
            >
              <option value="ALL">All packages</option>
              <option value="NONE">No package</option>
              {PACKAGE_OPTIONS.map((subscriptionPackage) => (
                <option key={subscriptionPackage} value={subscriptionPackage}>
                  {subscriptionPackage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[1080px] table-auto text-left text-sm">
            <thead className="bg-primary-black-medium text-primary-white">
              <tr>
                <SortableTableHeader
                  label="User"
                  sortKey="user"
                  sortState={sortState}
                  onSort={handleSortChange}
                />
                <SortableTableHeader
                  label="Phone"
                  sortKey="phone"
                  sortState={sortState}
                  onSort={handleSortChange}
                />
                <SortableTableHeader
                  label="Package"
                  sortKey="package"
                  sortState={sortState}
                  onSort={handleSortChange}
                />
                <SortableTableHeader
                  label="Registration"
                  sortKey="registration"
                  sortState={sortState}
                  onSort={handleSortChange}
                />
                <SortableTableHeader
                  label="Last Login"
                  sortKey="lastLogin"
                  sortState={sortState}
                  onSort={handleSortChange}
                />
                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <CourseUserRow
                  key={user.id}
                  user={user}
                  draftPackage={getDraftPackage(user)}
                  draftRegistrationDate={getDraftRegistrationDate(user)}
                  isUpdating={updateMutation.isPending}
                  onPackageDraftChange={handlePackageDraftChange}
                  onRegistrationDateDraftChange={
                    handleRegistrationDateDraftChange
                  }
                  onApply={handleApplyPackage}
                  onViewDetail={handleViewDetail}
                />
              ))}
            </tbody>
          </table>
          {usersQuery.isLoading && (
            <div className="p-8 text-center text-sm text-primary-white/55">
              Loading users...
            </div>
          )}
          {!usersQuery.isLoading && filteredUsers.length === 0 && (
            <div className="p-8 text-center text-sm text-primary-white/55">
              No users matched the current filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Wrap user package management with the dedicated course-admin auth popup.
const CourseUserManagement = () => (
  <CourseAdminAuthGate>
    {(courseToken) => <CourseUserManagementContent courseToken={courseToken} />}
  </CourseAdminAuthGate>
);

export default CourseUserManagement;
