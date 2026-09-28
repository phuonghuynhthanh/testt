interface TestSummaryStatsProps {
  totalTests: number | string;
  totalQuestions: number | string;
  scheduledTotal: number;
  submittedTotal: number;
}

// Render the top summary cards for test overview counts.
const TestSummaryStats = ({
  totalTests,
  totalQuestions,
  scheduledTotal,
  submittedTotal,
}: TestSummaryStatsProps) => (
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-5">
      <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
        Total tests
      </p>
      <p className="mt-2 text-3xl font-semibold text-primary-white">
        {totalTests}
      </p>
    </div>
    <div className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-5">
      <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
        Total questions
      </p>
      <p className="mt-2 text-3xl font-semibold text-primary-white">
        {totalQuestions}
      </p>
    </div>
    <div className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-5">
      <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
        Scheduled total
      </p>
      <p className="mt-2 text-3xl font-semibold text-primary-white">
        {scheduledTotal}
      </p>
    </div>
    <div className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-5">
      <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
        Submitted total
      </p>
      <p className="mt-2 text-3xl font-semibold text-primary-white">
        {submittedTotal}
      </p>
    </div>
  </section>
);

export default TestSummaryStats;
