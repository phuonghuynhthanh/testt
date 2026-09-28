interface DetailMetricProps {
  label: string;
  value: string | number;
  helper: string;
}

// Render one compact metric for the student detail summary.
const DetailMetric = ({ label, value, helper }: DetailMetricProps) => (
  <div className="rounded-lg border border-white/10 bg-primary-black-medium px-5 py-6 transition duration-200 hover:border-primary-green/35">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-white/45">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-primary-white">{value}</p>
      <p className="mt-2 text-sm text-primary-white/45">{helper}</p>
    </div>
  </div>
);

export default DetailMetric;
