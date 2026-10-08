/** Keep legacy local dates intact; show ISO timestamps in the workspace timezone. */
export function displayDateTime(value: string) {
  if (!value.includes('T')) return value.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);
}
