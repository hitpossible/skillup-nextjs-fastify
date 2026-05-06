"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { LayoutList, Settings } from "lucide-react"
import { CourseBuilder } from "./course-builder"
import { CourseSettings } from "./course-settings"

export function CourseEditClientWrapper({ 
  course, 
  dictionary, 
  locale, 
  isPublished,
}: { 
  course: any; 
  dictionary: any; 
  locale: string; 
  isPublished: boolean;
  hasLessons: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content')

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-8 border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('content')}
          className={cn(
            "pb-3 text-sm font-bold transition-all border-b-2 px-1 flex items-center gap-2",
            activeTab === 'content' ? "border-red-500 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <LayoutList className="h-4 w-4" />
          {dictionary.course_edit.tab_content || "เนื้อหาบทเรียน"}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "pb-3 text-sm font-bold transition-all border-b-2 px-1 flex items-center gap-2",
            activeTab === 'settings' ? "border-red-500 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <Settings className="h-4 w-4" />
          {dictionary.course_edit.tab_settings || "ตั้งค่าคอร์ส"}
        </button>
      </div>

      {activeTab === 'content' ? (
        <CourseBuilder initialCourse={course} dictionary={dictionary.course_edit} locale={locale} isPublished={isPublished} />
      ) : (
        <CourseSettings course={course} dictionary={{ ...dictionary.course_create, ...dictionary.course_edit }} locale={locale} />
      )}
    </div>
  )
}
