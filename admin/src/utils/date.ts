// Format UTC/provider timestamps normally while preserving timezone-less CMS wall time.
export const formatCmsDate = (value: string): string => {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value).toLocaleString("vi-VN");
  }

  const [date, time = ""] = value.split("T");
  const [year, month, day] = date.split("-");
  const clock = time.replace(/\.\d+$/, "");
  return `${day}/${month}/${year}${clock ? ` ${clock}` : ""}`;
};

// Format CMS timestamp into DD/MM/YYYY date only.
export const formatCmsDateOnly = (value: string): string => {
  if (!value) return "";
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return day && month && year ? `${day}/${month}/${year}` : formatCmsDate(value);
};
