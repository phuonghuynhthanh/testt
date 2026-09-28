import type {
  ClassFilterState,
} from "../testSummaryTypes";

interface TestSummaryClassFiltersProps {
  value: ClassFilterState;
  onChange: (nextValue: ClassFilterState) => void;
}

// Render the filter bar for the not-submitted class tab.
const TestSummaryClassFilters = ({
  value,
  onChange,
}: TestSummaryClassFiltersProps) => (
  <div className="mt-4 grid gap-3 md:grid-cols-3">
    <label className="flex flex-col gap-1 rounded-lg border border-white/10 bg-primary-black-medium/60 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
        Registration from
      </span>
      <input
        type="date"
        style={{ colorScheme: "dark" }}
        className="bg-transparent text-sm text-primary-white outline-none"
        value={value.registrationFrom}
        onChange={(event) =>
          onChange({
            ...value,
            registrationFrom: event.target.value,
          })
        }
      />
    </label>
    <label className="flex flex-col gap-1 rounded-lg border border-white/10 bg-primary-black-medium/60 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
        Registration to
      </span>
      <input
        type="date"
        style={{ colorScheme: "dark" }}
        className="bg-transparent text-sm text-primary-white outline-none"
        value={value.registrationTo}
        onChange={(event) =>
          onChange({
            ...value,
            registrationTo: event.target.value,
          })
        }
      />
    </label>
  </div>
);

export default TestSummaryClassFilters;
