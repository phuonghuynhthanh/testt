import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiCopy, FiRefreshCw, FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";

import type { CourseCertificate } from "../../../data/courseData";
import { getCourseCertificates } from "../../../services/course/handleCourse";
import CourseAdminAuthGate from "../components/CourseAdminAuthGate";

// Format issued dates defensively for admin table display.
const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

// Copy text to clipboard with a toast fallback for old browsers.
const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Certificate code copied.");
  } catch {
    toast.error("Unable to copy certificate code.");
  }
};

// Render one issued certificate row.
const CertificateRow = ({
  certificate,
}: {
  certificate: CourseCertificate;
}) => (
  <tr className="border-b border-white/10 transition duration-200 hover:bg-primary-green/5">
    <td className="px-4 py-5">
      <p className="font-semibold text-primary-white">
        {certificate.name || "--"}
      </p>
      <p className="mt-1 text-xs text-primary-white/50">
        {certificate.user_id || "--"}
      </p>
    </td>
    <td className="px-4 py-5">
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-primary-green/30 bg-primary-green/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary-green">
          {certificate.certificate_code || "--"}
        </span>
        {certificate.certificate_code && (
          <button
            type="button"
            className="rounded-md border border-white/15 p-2 text-primary-white/60 transition hover:border-primary-green hover:text-primary-green"
            onClick={() => copyToClipboard(certificate.certificate_code)}
            aria-label="Copy certificate code"
          >
            <FiCopy />
          </button>
        )}
      </div>
    </td>
    <td className="px-4 py-5 text-primary-white/70">
      {formatDateTime(certificate.created_at)}
    </td>
  </tr>
);

// Render the certificate management table and code search workflow.
const CourseCertificateManagementContent = ({
  courseToken,
}: {
  courseToken: string;
}) => {
  const [certificateCode, setCertificateCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");

  const certificatesQuery = useQuery({
    queryKey: ["course-certificates", courseToken, submittedCode],
    queryFn: () =>
      getCourseCertificates({ certificate_code: submittedCode }, courseToken),
  });

  const certificates = certificatesQuery.data || [];

  const issuedTodayCount = useMemo(() => {
    const today = new Date();
    return certificates.filter((certificate) => {
      const issuedDate = new Date(certificate.created_at);
      return (
        !Number.isNaN(issuedDate.getTime()) &&
        issuedDate.getFullYear() === today.getFullYear() &&
        issuedDate.getMonth() === today.getMonth() &&
        issuedDate.getDate() === today.getDate()
      );
    }).length;
  }, [certificates]);

  // Submit certificate code search to the backend.
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedCode(certificateCode.trim());
  };

  // Clear the current certificate code filter.
  const handleClearSearch = () => {
    setCertificateCode("");
    setSubmittedCode("");
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
              Certificate Management
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-primary-white/55">
              View issued course certificates and search by certificate code.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 transition hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => certificatesQuery.refetch()}
            disabled={certificatesQuery.isFetching}
          >
            <FiRefreshCw
              className={certificatesQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh certificates
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-primary-black-light p-5">
          <p className="text-sm text-primary-white/55">Loaded certificates</p>
          <p className="mt-2 text-3xl font-semibold text-primary-white">
            {certificates.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-primary-black-light p-5">
          <p className="text-sm text-primary-white/55">Issued today</p>
          <p className="mt-2 text-3xl font-semibold text-primary-white">
            {issuedTodayCount}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-primary-black-light p-5">
          <p className="text-sm text-primary-white/55">Current filter</p>
          <p className="mt-2 truncate text-lg font-semibold text-primary-white">
            {submittedCode || "All certificates"}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Issued certificates</h2>
            <p className="mt-1 text-sm text-primary-white/50">
              Search exact or partial certificate codes supported by backend.
            </p>
          </div>
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label className="flex min-w-72 items-center gap-2 rounded-md border border-white/20 bg-primary-black-medium px-3 py-3 text-primary-white focus-within:border-primary-green">
              <FiSearch className="shrink-0 text-primary-white/55" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-primary-white/35"
                value={certificateCode}
                placeholder="Search certificate code"
                onChange={(event) => setCertificateCode(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-primary-green/60 px-4 py-3 text-sm font-semibold text-primary-green transition hover:bg-primary-green hover:text-primary-black"
            >
              Search
            </button>
            {submittedCode && (
              <button
                type="button"
                className="rounded-md border border-white/20 px-4 py-3 text-sm text-primary-white/80 transition hover:border-primary-green hover:text-primary-green"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[680px] table-auto text-left text-sm">
            <thead className="bg-primary-black-medium text-primary-white">
              <tr>
                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                  Learner
                </th>
                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                  Certificate Code
                </th>
                <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                  Issued At
                </th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate) => (
                <CertificateRow
                  key={`${certificate.user_id}-${certificate.certificate_code}`}
                  certificate={certificate}
                />
              ))}
            </tbody>
          </table>
          {certificatesQuery.isLoading && (
            <div className="p-8 text-center text-sm text-primary-white/55">
              Loading certificates...
            </div>
          )}
          {!certificatesQuery.isLoading && certificates.length === 0 && (
            <div className="p-8 text-center text-sm text-primary-white/55">
              No certificates matched the current filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Wrap certificate management with the dedicated course-admin auth popup.
const CourseCertificateManagement = () => (
  <CourseAdminAuthGate>
    {(courseToken) => (
      <CourseCertificateManagementContent courseToken={courseToken} />
    )}
  </CourseAdminAuthGate>
);

export default CourseCertificateManagement;
