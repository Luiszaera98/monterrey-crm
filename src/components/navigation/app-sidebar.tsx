
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    LayoutDashboard,
    UsersRound,
    Boxes,
    FileText,
    Receipt,
    Settings2,
    ChevronDown,
    ChevronUp,
    Tag,
    CreditCard,
    ListRestart,
    type LucideIcon,
    History,
    Archive,
    LogOut,
    User,
    Sun,
    Moon,
    Laptop,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import type { UserRole } from "@/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/authActions";
import { useTheme } from "next-themes";

interface NavItem {
    href: string;
    label: string;
    icon?: LucideIcon;
    roles?: UserRole[];
    subItems?: NavItem[];
    exactMatch?: boolean;
}

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Panel Principal", icon: LayoutDashboard, roles: ['Administrador', 'Ventas', 'Inventario'] },
    { href: "/clients", label: "Contactos", icon: UsersRound, roles: ['Administrador', 'Ventas', 'Inventario'] },
    { href: "/inventory", label: "Inventario", icon: Boxes, roles: ['Administrador', 'Inventario'] },
    { href: "/invoices", label: "Facturas", icon: FileText, roles: ['Administrador', 'Ventas'] },
    { href: "/payments", label: "Transacciones", icon: History, roles: ['Administrador', 'Ventas'] },
    {
        href: "/expenses",
        label: "Gastos",
        icon: Receipt,
        roles: ['Administrador'],
    },
    {
        href: "/settings",
        label: "Configuración",
        icon: Settings2,
        roles: ['Administrador', 'Ventas', 'Inventario'],
    },
];

interface AppSidebarProps {
    currentUserRole?: UserRole;
    userName?: string;
    userEmail?: string;
}

export function AppSidebar({ currentUserRole, userName, userEmail }: AppSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
    const { setTheme } = useTheme();

    const toggleSubmenu = (label: string) => {
        setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const filteredNavItems = navItems.filter(item =>
        !currentUserRole || !item.roles || item.roles.includes(currentUserRole)
    ).map(item => ({
        ...item,
        subItems: item.subItems?.filter(sub => !currentUserRole || !sub.roles || sub.roles.includes(currentUserRole))
    }));

    useEffect(() => {
        const activeParent = filteredNavItems.find(item =>
            item.subItems?.some(subItem => isNavItemActive(subItem, item.href))
        );
        if (activeParent && !openSubmenus[activeParent.label]) {
            setOpenSubmenus(prev => ({ ...prev, [activeParent.label]: true }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams, currentUserRole]);

    const isNavItemActive = (item: NavItem, parentHref?: string): boolean => {
        if (item.exactMatch) return pathname === item.href;

        if (item.href === "/dashboard") return pathname === item.href;
        if (item.href === "/clients" && pathname === "/clients") return true;
        if (item.href === "/inventory" && pathname === "/inventory") return true;
        if (item.href === "/invoices" && pathname === "/invoices") return true;
        if (item.href === "/payments" && pathname === "/payments") return true;
        if (item.href === "/expenses" && pathname === "/expenses") return true;
        if (item.href === "/settings" && pathname === "/settings") return true;

        if (item.subItems && item.subItems.length > 0) {
            if (item.subItems.some(subItem => pathname === subItem.href || (subItem.exactMatch === false && pathname.startsWith(subItem.href)))) {
                return true;
            }
            return pathname.startsWith(item.href + '/');
        }
        return pathname.startsWith(item.href) && item.href !== '/';
    };

    const isSubmenuButtonActive = (item: NavItem): boolean => {
        if (item.subItems?.some(subItem => isNavItemActive(subItem, item.href))) return true;
        if (pathname.startsWith(item.href + '/') || pathname === item.href) return true;
        return false;
    };

    if (!currentUserRole) {
        return null;
    }

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
            <SidebarHeader className="p-0 border-b border-sidebar-border">
                <Link href="/dashboard" className="flex items-center h-20 px-4 transition-colors hover:bg-sidebar-accent/50">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white p-1 shadow-sm group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10">
                        <Image src="/logo.png" alt="IM" width={40} height={40} className="w-full h-full object-contain" />
                    </div>
                    <div className="ml-3 flex flex-col group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-bold text-sidebar-foreground leading-tight">
                            Industrias Monterrey SRL
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">
                            CRM & Inventario
                        </span>
                    </div>
                </Link>
            </SidebarHeader>
            <SidebarContent className="flex-1 p-2">
                <ScrollArea className="h-full">
                    <SidebarMenu className="space-y-1">
                        {filteredNavItems.map((item) => (
                            <SidebarMenuItem key={item.label}>
                                {item.subItems && item.subItems.length > 0 ? (
                                    <>
                                        <SidebarMenuButton
                                            onClick={() => toggleSubmenu(item.label)}
                                            isActive={isSubmenuButtonActive(item)}
                                            className="justify-between w-full font-medium"
                                            tooltip={item.label}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon && <item.icon className="h-4 w-4 opacity-70" />}
                                                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                            </div>
                                            {openSubmenus[item.label] ? <ChevronUp className="h-4 w-4 group-data-[collapsible=icon]:hidden opacity-50" /> : <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden opacity-50" />}
                                        </SidebarMenuButton>
                                        {openSubmenus[item.label] && (
                                            <SidebarMenuSub className="group-data-[collapsible=icon]:hidden pl-4 mt-1 space-y-1 border-l border-sidebar-border/50 ml-4">
                                                {item.subItems.map(subItem => (
                                                    <SidebarMenuSubItem key={subItem.label}>
                                                        <Link href={subItem.href} passHref legacyBehavior>
                                                            <SidebarMenuSubButton
                                                                isActive={isNavItemActive(subItem, item.href)}
                                                                className="text-sm py-2"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span>{subItem.label}</span>
                                                                </div>
                                                            </SidebarMenuSubButton>
                                                        </Link>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        )}
                                    </>
                                ) : (
                                    <Link href={item.href} passHref legacyBehavior>
                                        <SidebarMenuButton
                                            isActive={isNavItemActive(item)}
                                            tooltip={item.label}
                                            className="font-medium"
                                        >
                                            {item.icon && <item.icon className="h-4 w-4 opacity-70" />}
                                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                        </SidebarMenuButton>
                                    </Link>
                                )}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </ScrollArea>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border mt-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full hover:bg-sidebar-accent/50 p-2 rounded-md transition-colors group-data-[collapsible=icon]:justify-center">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border border-border shadow-sm">
                                <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col group-data-[collapsible=icon]:hidden text-left flex-1">
                                <span className="text-sm font-medium text-sidebar-foreground">{userName || 'Usuario'}</span>
                                <span className="text-xs text-muted-foreground">{userEmail || currentUserRole}</span>
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logoutAction()} className="text-destructive focus:text-destructive cursor-pointer">
                            <LogOut className="h-4 w-4 mr-2" />
                            Cerrar Sesión
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Tema</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                            <Sun className="h-4 w-4 mr-2" />
                            Claro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                            <Moon className="h-4 w-4 mr-2" />
                            Oscuro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                            <Laptop className="h-4 w-4 mr-2" />
                            Sistema
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
