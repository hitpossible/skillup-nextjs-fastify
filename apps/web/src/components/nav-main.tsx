"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      isActive?: boolean
    }[]
  }[]
}) {
  return (
    <SidebarGroup className="px-2 py-1">
      <SidebarMenu className="gap-0.5">
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.items?.length ? (
              <Collapsible defaultOpen={item.isActive} className="group/collapsible">
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none",
                      item.isActive
                        ? "bg-red-50 text-red-500 border-l-[3px] border-red-500 rounded-l-none"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-[3px] border-transparent rounded-l-none"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "size-5 shrink-0",
                          item.isActive ? "text-red-500" : "text-gray-500"
                        )}
                        strokeWidth={1.8}
                      />
                      <span>{item.title}</span>
                    </div>
                    <ChevronRight className={cn(
                      "size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90",
                      item.isActive ? "text-red-500" : "text-gray-400"
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mr-0 pr-0 border-l border-gray-200 ml-6 pl-4 mt-1 space-y-1">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                          <Link
                            href={subItem.url}
                            className={cn(
                              "text-gray-600 hover:text-red-500 hover:bg-red-50/50 transition-colors",
                              subItem.isActive && "text-red-500 font-medium"
                            )}
                          >
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Link
                href={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none",
                  item.isActive
                    ? "bg-red-50 text-red-500 border-l-[3px] border-red-500 rounded-l-none"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-[3px] border-transparent rounded-l-none"
                )}
              >
                <item.icon
                  className={cn(
                    "size-5 shrink-0",
                    item.isActive ? "text-red-500" : "text-gray-500"
                  )}
                  strokeWidth={1.8}
                />
                <span>{item.title}</span>
              </Link>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
