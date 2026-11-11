import { V2_KEY, validate, type State } from "./model.ts";
export function load(): State | null {
  const raw = localStorage.getItem(V2_KEY);
  if (raw === null) return null;
  const s: unknown = JSON.parse(raw);
  validate(s);
  return s;
}
export function save(next: State, expected: string | null) {
  validate(next);
  if (localStorage.getItem(V2_KEY) !== expected)
    throw Error(
      "Os dados mudaram em outra aba. Atualize a página antes de continuar.",
    );
  const raw = JSON.stringify(next);
  localStorage.setItem(V2_KEY, raw);
  return raw;
}
export function download(
  content: string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
