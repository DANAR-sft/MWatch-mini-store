"use client";

import * as React from "react";
import {
  IconHome,
  IconInnerShadowTop,
  IconCirclePlus,
  IconChecklist,
} from "@tabler/icons-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/store/hookZustand";
import { useEffect } from "react";
import { useProfile } from "@/lib/store/hookZustand";
import Link from "next/link";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: IconHome,
    },
    {
      title: "Add Product",
      url: "/admin/dashboard/post-product",
      icon: IconCirclePlus,
    },
    {
      title: "Orders",
      url: "/admin/dashboard/orders",
      icon: IconChecklist,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { fetchUser } = useAuth();
  const { profile, fetchProfileById } = useProfile();

  useEffect(() => {
    fetchUser().then((data) => {
      if (data && data.id) {
        fetchProfileById(data.id);
      }
    });
  }, []);
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="border-b pb-1.5">
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <span className="flex flex-row items-center text-base font-semibold">
                  <IconInnerShadowTop className="size-4!" />
                  MWacth
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {profile ? <NavUser profile={profile} /> : null}
      </SidebarFooter>
    </Sidebar>
  );
}
