import { useState } from 'react';
import { House, ReceiptText, Target, Info, ChevronDown, ExternalLink, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
 SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
export type Screen = 'overview' | 'entries' | 'planning' | 'about';
export function FinanceSidebar({screen,onNavigate}:{screen:Screen;onNavigate:(screen:Screen)=>void}) {
 const {state,setOpenMobile} = useSidebar();
 const [plansOpen,setPlansOpen] = useState(false);
 function go(next:Screen){onNavigate(next);setOpenMobile(false);}
 return <Sidebar collapsible="icon" className="finance-sidebar">
  <SidebarHeader><SidebarMenu><SidebarMenuItem>
   <SidebarMenuButton size="lg" className="finance-brand" aria-label="Finly — início" onClick={()=>go('overview')}>
    <span className="brand-copy"><strong>Finly</strong><small>FINANÇAS COM CLAREZA</small></span>
   </SidebarMenuButton>
  </SidebarMenuItem></SidebarMenu></SidebarHeader><SidebarSeparator/>
  <SidebarContent><SidebarGroup><SidebarGroupLabel>SEU ESPAÇO</SidebarGroupLabel><SidebarMenu>
   <SidebarMenuItem><SidebarMenuButton tooltip="Visão geral" aria-label="Visão geral" isActive={screen==='overview'} onClick={()=>go('overview')}><House/><span>Visão geral</span></SidebarMenuButton></SidebarMenuItem>
   <SidebarMenuItem><SidebarMenuButton tooltip="Lançamentos" aria-label="Lançamentos" isActive={screen==='entries'} onClick={()=>go('entries')}><ReceiptText/><span>Lançamentos</span></SidebarMenuButton></SidebarMenuItem>
   <Collapsible asChild open={plansOpen} onOpenChange={next=>{setPlansOpen(state==='collapsed'?true:next)}}>
    <SidebarMenuItem>
     <CollapsibleTrigger asChild><SidebarMenuButton tooltip="Planejamentos" aria-label="Planejamentos" isActive={screen==='planning'} onClick={()=>onNavigate('planning')}><Target/><span>Planejamentos</span><ChevronDown className={`planning-chevron ${plansOpen?'expanded':''}`}/></SidebarMenuButton></CollapsibleTrigger>
     <CollapsibleContent><SidebarMenuSub><SidebarMenuSubItem><SidebarMenuSubButton asChild><button type="button" onClick={()=>go('planning')}>Recursos disponíveis</button></SidebarMenuSubButton></SidebarMenuSubItem><li className="planning-status">Metas aguardam migração segura</li></SidebarMenuSub></CollapsibleContent>
    </SidebarMenuItem>
   </Collapsible>
   <SidebarMenuItem><SidebarMenuButton tooltip="Sobre a migração" aria-label="Sobre a migração" isActive={screen==='about'} onClick={()=>go('about')}><Info/><span>Sobre a migração</span></SidebarMenuButton></SidebarMenuItem>
  </SidebarMenu></SidebarGroup></SidebarContent>
  <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Abrir Finly completo"><a href="/legacy/" aria-label="Abrir Finly completo"><ExternalLink/><span>Abrir Finly completo</span></a></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem className="mobile-menu-close"><SidebarMenuButton aria-label="Fechar menu" onClick={()=>setOpenMobile(false)}><X/><span>Fechar menu</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
 </Sidebar>;
}
