import { useEffect, useState } from "react";
import { monthNow } from "@/lib/legacy";
import { monthOK } from "./model";
export const destinations = [
  { id: "overview", path: "visao-geral", label: "Visão geral" },
  { id: "entries", path: "lancamentos", label: "Lançamentos" },
  { id: "invoice", path: "fatura", label: "Fatura do cartão" },
  { id: "installments", path: "parcelas", label: "Parcelas e recorrências" },
  { id: "refunds", path: "reembolsos", label: "Reembolsos" },
  { id: "planning", path: "planejamentos", label: "Planejamentos" },
  { id: "settings", path: "configuracoes", label: "Configurações" },
] as const;
export type Screen = (typeof destinations)[number]["id"];
export const tabs = ["financeiro", "aparencia", "backup", "sobre"] as const;
export type SettingsTab = (typeof tabs)[number];
type Location = { screen: Screen; period: string; tab: SettingsTab };
export function parseLocation(hash: string): Location {
  const u = new URL(
    hash.replace(/^#/, "") || "/visao-geral",
    "https://finly.local",
  );
  const segments = u.pathname.split("/").filter(Boolean);
  return {
    screen: destinations.find((d) => d.path === segments[0])?.id ?? "overview",
    period: monthOK(u.searchParams.get("competencia"))
      ? u.searchParams.get("competencia")!
      : monthNow(),
    tab: tabs.includes(segments[1] as SettingsTab)
      ? (segments[1] as SettingsTab)
      : "financeiro",
  };
}
export function routeHref(
  screen: Screen,
  period: string,
  tab: SettingsTab = "financeiro",
) {
  return (
    "#/" +
    destinations.find((d) => d.id === screen)!.path +
    (screen === "settings" ? "/" + tab : "") +
    "?competencia=" +
    encodeURIComponent(period)
  );
}
export function useNavigation() {
  const [route, setRoute] = useState(() => parseLocation(window.location.hash));
  useEffect(() => {
    const update = () =>
      setRoute((old) => {
        const next = parseLocation(window.location.hash);
        return JSON.stringify(next) === JSON.stringify(old) ? old : next;
      });
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    if (!window.location.hash)
      history.replaceState(
        null,
        "",
        routeHref(route.screen, route.period, route.tab),
      );
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  function navigate(next: Location) {
    const href = routeHref(next.screen, next.period, next.tab);
    if (window.location.hash !== href) history.pushState(null, "", href);
    setRoute(next);
  }
  return {
    ...route,
    setScreen: (screen: Screen) =>
      navigate({
        ...route,
        screen,
        tab: screen === "settings" ? "financeiro" : route.tab,
      }),
    setPeriod: (period: string) => {
      if (monthOK(period)) navigate({ ...route, period });
    },
    setTab: (tab: SettingsTab) =>
      navigate({ ...route, screen: "settings", tab }),
    href: (screen: Screen) => routeHref(screen, route.period),
  };
}
