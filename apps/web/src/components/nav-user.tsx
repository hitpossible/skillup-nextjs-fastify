"use client"

import Link from "next/link"
import {
  LogOut,
  Bell,
  Award,
  ChevronRight,
  User,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/providers/auth-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { getFullImageUrl } from "@/lib/api"

function getInitials(name: string) {
  if (!name) return "U"
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function NavUser({ dictionary, locale }: { dictionary: any, locale: string }) {
  const { user } = useAuth()
  if (!user || !dictionary) return null

  // Use fullName from profile if available, fallback to email prefix
  const displayName = user.fullName || user.email.split("@")[0]

  return (
    <div className="flex items-center gap-3">
      <LanguageSwitcher locale={locale} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Bell className="size-5" strokeWidth={1.8} />
            {/* You can show the red dot if there are actual notifications, we'll hide it for empty state to match "No notifications" */}
            {/* <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span> */}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[320px] rounded-[24px] bg-white p-0 shadow-xl border-gray-100"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <div className="p-5 pb-2">
            <h3 className="font-semibold text-[17px] text-gray-900">{dictionary.notifications}</h3>
          </div>
          
          <div className="px-6 py-8 flex flex-col items-center justify-center text-center">
            {/* Using an icon instead of the mailbox image */}
            <div className="relative h-24 w-24 mb-4 opacity-40">
               <div className="absolute inset-0 bg-gray-100 rounded-2xl rotate-3"></div>
               <div className="absolute inset-0 bg-gray-200 rounded-2xl -rotate-3"></div>
               <div className="absolute inset-0 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center">
                 <Bell className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
               </div>
            </div>
            
            <div className="text-[16px] font-semibold text-gray-700 mb-2">{dictionary.no_notifications}</div>
            <div className="text-[13px] text-gray-500 leading-[1.6]">
              {dictionary.no_notifications_description}
            </div>
          </div>
          
          <div className="p-4 pt-2">
            <button className="w-full py-3 bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#555] text-[15px] font-medium rounded-2xl transition-colors">
              {dictionary.view_all}
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-blue-500 text-white outline-none focus-visible:ring-2 focus-visible:ring-primary hover:opacity-80 transition-opacity">
            {user.avatarUrl ? (
              <img src={getFullImageUrl(user.avatarUrl)} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[300px] rounded-2xl bg-white p-3 shadow-xl"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuLabel className="p-0 font-normal mb-3">
            <div className="flex items-center gap-3 rounded-[16px] border border-gray-100 p-3 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[#5d94ff] text-white">
                {user.avatarUrl ? (
                  <img src={getFullImageUrl(user.avatarUrl)} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold">{getInitials(user.fullName ?? displayName ?? "")}</span>
                )}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold text-[15px]">{displayName}</span>
                <span className="truncate text-[13px] text-gray-500 font-medium">{user.email}</span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-50">
                <ChevronRight className="h-4 w-4 text-gray-500" strokeWidth={2} />
              </div>
            </div>
          </DropdownMenuLabel>
          
          {/* <DropdownMenuGroup className="space-y-0.5"> */}
            {/* <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <BookOpen className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              {dictionary.my_courses}
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <Library className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              {dictionary.eligible_courses}
            </DropdownMenuItem> */}
            {/* <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <FileText className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              หลักสูตร DSD ของฉัน
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <FileCheck className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              หลักสูตร CPD ของฉัน
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <ListVideo className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              เพลย์ลิสต์ของฉัน
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <Award className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              ใบประกาศนียบัตร
            </DropdownMenuItem> */}
          {/* </DropdownMenuGroup> */}
          
          {/* <DropdownMenuSeparator className="my-2 bg-gray-100" /> */}
          
          {/* <DropdownMenuGroup>
            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
              <Wallet className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              ประวัติการชำระเงินและแพ็กเกจ
            </DropdownMenuItem>
          </DropdownMenuGroup> */}

          <DropdownMenuSeparator className="my-2 bg-gray-100" />

          <DropdownMenuGroup className="space-y-0.5">
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/certificates`} className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl flex items-center">
                <Award className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
                {dictionary.certificates}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-2 bg-gray-100" />

          <DropdownMenuGroup className="space-y-0.5">
            <DropdownMenuItem 
              onSelect={async (e) => {
                e.preventDefault();
                await fetch("/api/logout", { method: "POST" });
                window.location.href = `/${locale}/login`;
              }}
              className="py-2.5 px-3 cursor-pointer text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl outline-none"
            >
              <LogOut className="mr-3 size-[22px] text-gray-600" strokeWidth={1.5} />
              {dictionary.logout}
            </DropdownMenuItem>
          </DropdownMenuGroup>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
