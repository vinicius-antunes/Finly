import {
  House,
  ReceiptText,
  CreditCard,
  Layers,
  RefreshCw,
  Target,
  Settings,
  X,
} from "lucide-react";
import { destinations, type Screen, routeHref } from "@/finance/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
export type { Screen } from "@/finance/navigation";
const icons = {
  overview: House,
  entries: ReceiptText,
  invoice: CreditCard,
  installments: Layers,
  refunds: RefreshCw,
  planning: Target,
  settings: Settings,
};
export function FinanceSidebar({
  screen,
  onNavigate,
  period,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  period: string;
}) {
  const { setOpenMobile, isMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="finance-sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="finance-brand"
              aria-label="Finly — início"
              onClick={() => {
                onNavigate("overview");
                setOpenMobile(false);
              }}
            >
              <span className="brand-copy">
                <strong>Finly</strong>
                <small>FINANÇAS COM CLAREZA</small>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>SEU ESPAÇO</SidebarGroupLabel>
          <SidebarMenu>
            {destinations.map((d) => {
              const Icon = icons[d.id];
              return (
                <SidebarMenuItem key={d.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={d.label}
                    isActive={screen === d.id}
                  >
                    <a
                      href={routeHref(d.id, period)}
                      aria-label={d.label}
                      aria-current={screen === d.id ? "page" : undefined}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
                          return;
                        e.preventDefault();
                        onNavigate(d.id);
                        setOpenMobile(false);
                      }}
                    >
                      <Icon />
                      <span>{d.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      {isMobile && (
        <SidebarFooter>
          <SidebarMenuButton
            aria-label="Fechar menu"
            onClick={() => setOpenMobile(false)}
          >
            <X />
            <span>Fechar menu</span>
          </SidebarMenuButton>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
