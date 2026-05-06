"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  Settings,
  BookOpenText,
  Search,
  GraduationCap,
  ShieldCheck,
  Users,
  Tag,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { useAuth } from "@/components/providers/auth-provider"
import { hasRole } from "@/lib/auth-shared"
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar"

export function AppSidebar({ dictionary, locale, ...props }: React.ComponentProps<typeof Sidebar> & { dictionary: any, locale: string }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    { title: dictionary.dashboard, url: `/${locale}/dashboard`, icon: LayoutGrid },
    { title: dictionary.catalog, url: `/${locale}/catalog`, icon: Search },
    { title: dictionary.my_courses, url: `/${locale}/my-courses`, icon: GraduationCap },
  ]

  const isInstructorOrAdmin = hasRole(user, "instructor", "admin")
  const isAdmin = hasRole(user, "admin")

  if (isInstructorOrAdmin) {
    navItems.push({
      title: dictionary.course_management,
      url: "#",
      icon: BookOpenText,
      items: [
        { title: dictionary.course_list, url: `/${locale}/course/list` },
      ],
    })
  }

  if (isAdmin) {
    navItems.push({
      title: dictionary.admin,
      url: "#",
      icon: ShieldCheck,
      items: [
        { title: dictionary.admin_users,        url: `/${locale}/admin/users` },
        { title: dictionary.admin_categories,   url: `/${locale}/admin/categories` },
        { title: dictionary.admin_enrollments,  url: `/${locale}/admin/enrollments` },
      ],
    })
    
  }
  navItems.push({
      title: dictionary.settings,
      url: "#",
      icon: Settings,
      items: [
        { title: dictionary.account, url: `/${locale}/settings/account` },
        { title: dictionary.notification_inbox, url: `/${locale}/settings/notifications` },
        { title: dictionary.notification_prefs, url: `/${locale}/settings/notification-preferences` },
      ],
    })

  const mappedItems = navItems.map((item) => {
    const isMainActive = pathname === item.url || (item.url !== "#" && pathname.startsWith(item.url + "/"))
    const mappedSubItems = item.items?.map((subItem: any) => ({
      ...subItem,
      isActive: pathname === subItem.url || pathname.startsWith(subItem.url + "/")
    }))
    const isAnySubActive = mappedSubItems?.some((s: any) => s.isActive)

    return {
      ...item,
      isActive: isMainActive || isAnySubActive,
      items: mappedSubItems
    }
  })

  return (
    <Sidebar
      className="top-14 !h-[calc(100svh-3.5rem)] border-r border-border bg-white"
      {...props}
    >
      <SidebarContent className="py-4">
        <NavMain items={mappedItems} />
      </SidebarContent>
    </Sidebar>
  )
}
