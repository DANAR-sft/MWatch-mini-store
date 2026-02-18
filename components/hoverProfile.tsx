"use client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { IProfile } from "../types/definitions";
import { Button } from "./ui/button";
import { useAuth } from "../lib/store/hookZustand";
import Link from "next/link";
import { LayoutDashboard, LogOut, Package } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarBadge,
} from "@/components/ui/avatar";

export function HoverProfile({ id, full_name, email, role }: IProfile) {
  const { signOut } = useAuth();

  return (
    <HoverCard openDelay={10} closeDelay={100}>
      <HoverCardTrigger>
        <Avatar>
          <AvatarImage
            src="https://github.com/shadcn.png"
            className="cursor-pointer"
          />
          <AvatarFallback>
            {full_name ? full_name.charAt(0) : ""}
          </AvatarFallback>
        </Avatar>
      </HoverCardTrigger>
      <HoverCardContent className="w-fit p-2">
        <div className="flex flex-col items-end">
          {role === "customer" && (
            <Link href="/orders" className="border-b mb-2 pb-2">
              <div className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer">
                <span>Orders</span>
                <Package className="w-4 h-4" />
              </div>
            </Link>
          )}
          <div className="flex flex-row w-full justify-end items-end">
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer"
            >
              <span>Sign Out</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
