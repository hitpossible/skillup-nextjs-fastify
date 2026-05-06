"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, GripVertical, FileText, Video, HelpCircle, Trash2, LayoutList, Edit2, ArrowUp, ArrowDown, AlertTriangle, Loader2, Settings, FileEdit, Lock } from "lucide-react"
import { createSectionAction, createLessonAction, deleteSectionAction, deleteLessonAction, updateSectionAction, updateLessonAction } from "./actions"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function CourseBuilder({
  initialCourse,
  dictionary,
  locale,
  isPublished
}: {
  initialCourse: any;
  dictionary: any;
  locale: string;
  isPublished: boolean;
}) {
  const [course, setCourse] = useState(initialCourse)
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [addingSection, setAddingSection] = useState(false)
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null)
  
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newLessonType, setNewLessonType] = useState("video")
  const [newLessonUrl, setNewLessonUrl] = useState("")

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editSectionTitle, setEditSectionTitle] = useState("")

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editLessonTitle, setEditLessonTitle] = useState("")
  const [editLessonUrl, setEditLessonUrl] = useState("")

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'section' | 'lesson', sectionId: string, lessonId?: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

  // Ensure sections are sorted by sortOrder
  const sections = [...(course.sections || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) return
    await createSectionAction(course.id, newSectionTitle)
    toast({ title: dictionary.toast_section_added })
    window.location.reload()
  }

  const handleUpdateSection = async (sectionId: string) => {
    if (!editSectionTitle.trim()) return
    await updateSectionAction(course.id, sectionId, { title: editSectionTitle })
    toast({ title: dictionary.toast_section_updated })
    window.location.reload()
  }

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sections.length - 1) return
    
    const newSections = [...sections]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newSections[index]
    newSections[index] = newSections[swapIndex]
    newSections[swapIndex] = temp

    await Promise.all(newSections.map((sec, i) => updateSectionAction(course.id, sec.id, { sortOrder: i })))
    toast({ title: dictionary.toast_section_moved })
    window.location.reload()
  }

  const handleCreateLesson = async (sectionId: string) => {
    if (!newLessonTitle.trim()) return
    await createLessonAction(course.id, sectionId, {
      title: newLessonTitle,
      type: newLessonType,
      contentUrl: newLessonUrl.trim() || undefined,
    })
    toast({ title: dictionary.toast_lesson_added })
    window.location.reload()
  }

  const handleUpdateLesson = async (sectionId: string, lessonId: string) => {
    if (!editLessonTitle.trim()) return
    await updateLessonAction(course.id, sectionId, lessonId, {
      title: editLessonTitle,
      contentUrl: editLessonUrl.trim() || undefined,
    })
    toast({ title: dictionary.toast_lesson_updated })
    window.location.reload()
  }

  const handleMoveLesson = async (sectionId: string, lessons: any[], index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === lessons.length - 1) return
    
    const sortedLessons = [...lessons].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    
    const temp = sortedLessons[index]
    sortedLessons[index] = sortedLessons[swapIndex]
    sortedLessons[swapIndex] = temp

    await Promise.all(sortedLessons.map((les, i) => updateLessonAction(course.id, sectionId, les.id, { sortOrder: i })))
    toast({ title: dictionary.toast_lesson_moved })
    window.location.reload()
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    if (deleteConfirm.type === 'section') {
      await deleteSectionAction(course.id, deleteConfirm.sectionId)
      toast({ title: dictionary.toast_section_deleted })
    } else if (deleteConfirm.type === 'lesson' && deleteConfirm.lessonId) {
      await deleteLessonAction(course.id, deleteConfirm.sectionId, deleteConfirm.lessonId)
      toast({ title: dictionary.toast_lesson_deleted })
    }
    setIsDeleting(false)
    setDeleteConfirm(null)
    window.location.reload()
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-blue-500" />
      case "text": return <FileText className="h-4 w-4 text-green-500" />
      case "quiz": return <HelpCircle className="h-4 w-4 text-orange-500" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">

      {isPublished && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <p>
            <strong>{dictionary.published_lock_title}:</strong>{" "}
            {dictionary.published_lock_desc}
          </p>
        </div>
      )}

      {sections.length === 0 && !addingSection ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center animate-in fade-in-50">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <LayoutList className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">{dictionary.builder_empty_title}</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">{dictionary.builder_empty_desc}</p>
          <Button onClick={() => setAddingSection(true)} className="bg-red-500 hover:bg-red-600 rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            {dictionary.builder_create_first}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section: any, sectionIdx: number) => {
            const lessons = [...(section.lessons || [])].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
            return (
            <Card key={section.id} className="rounded-2xl border-gray-200 overflow-hidden shadow-sm">
              <CardHeader className="bg-gray-50/50 p-4 border-b border-gray-100 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col text-gray-400">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button disabled={isPublished || sectionIdx === 0} onClick={() => handleMoveSection(sectionIdx, 'up')} className="hover:text-gray-900 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent>{dictionary.tooltip_move_up}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button disabled={isPublished || sectionIdx === sections.length - 1} onClick={() => handleMoveSection(sectionIdx, 'down')} className="hover:text-gray-900 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent>{dictionary.tooltip_move_down}</TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {editingSectionId === section.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="text" 
                        value={editSectionTitle}
                        onChange={(e) => setEditSectionTitle(e.target.value)}
                        className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateSection(section.id)}
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleUpdateSection(section.id)} className="h-9 bg-red-500 hover:bg-red-600 rounded-full px-5">{dictionary.builder_save}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)} className="h-9 rounded-full px-5">{dictionary.builder_cancel}</Button>
                      </div>
                    </div>
                  ) : (
                    <CardTitle className="text-lg font-bold">{section.title}</CardTitle>
                  )}
                </div>

                {!editingSectionId && !isPublished && (
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingSectionId(section.id); setEditSectionTitle(section.title) }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{dictionary.tooltip_edit_title}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'section', sectionId: section.id })} className="text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{dictionary.tooltip_delete}</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {lessons.map((lesson: any, lessonIdx: number) => (
                    <div key={lesson.id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors pl-8 group">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col text-gray-300 group-hover:text-gray-400">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button disabled={isPublished || lessonIdx === 0} onClick={() => handleMoveLesson(section.id, lessons, lessonIdx, 'up')} className="hover:text-gray-900 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                            </TooltipTrigger>
                            <TooltipContent>{dictionary.tooltip_move_up}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button disabled={isPublished || lessonIdx === lessons.length - 1} onClick={() => handleMoveLesson(section.id, lessons, lessonIdx, 'down')} className="hover:text-gray-900 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                            </TooltipTrigger>
                            <TooltipContent>{dictionary.tooltip_move_down}</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 flex-shrink-0">
                          {getIconForType(lesson.type)}
                        </div>
                        
                        {editingLessonId === lesson.id ? (
                          <div className="flex items-center gap-2 flex-1 my-1">
                            <input 
                              type="text" 
                              value={editLessonTitle}
                              onChange={(e) => setEditLessonTitle(e.target.value)}
                              className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:outline-none"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => handleUpdateLesson(section.id, lesson.id)} className="h-9 bg-red-500 hover:bg-red-600 text-xs px-6 rounded-full">{dictionary.builder_save}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingLessonId(null)} className="h-9 text-xs px-4 rounded-full">{dictionary.builder_cancel}</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <Link href={`/${locale}/course/${course.id}/section/${section.id}/lesson/${lesson.id}`} className="font-medium text-gray-700 hover:text-blue-600 hover:underline">
                              {lesson.title}
                            </Link>
                            {lesson.contentUrl && lesson.type !== "video" && <span className="text-xs text-blue-500 truncate max-w-xs">{lesson.contentUrl}</span>}
                          </div>
                        )}
                      </div>

                      {!editingLessonId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-green-600 hover:bg-green-50 h-8 w-8">
                                <Link href={`/${locale}/course/${course.id}/section/${section.id}/lesson/${lesson.id}`}>
                                  <FileEdit className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{dictionary.tooltip_edit_content}</TooltipContent>
                          </Tooltip>

                          {!isPublished && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingLessonId(lesson.id); setEditLessonTitle(lesson.title); setEditLessonUrl(lesson.contentUrl || "") }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{dictionary.tooltip_edit_title}</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'lesson', sectionId: section.id, lessonId: lesson.id })} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{dictionary.tooltip_delete}</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {!isPublished && addingLessonToSection === section.id ? (
                    <div className="p-4 pl-12 bg-gray-50 border-t border-dashed border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg h-9 px-1 shadow-sm">
                          <Button 
                            type="button"
                            variant={newLessonType === "video" ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setNewLessonType("video")}
                            className={`h-7 px-2 rounded-md ${newLessonType === "video" ? "bg-gray-100" : ""}`}
                          >
                            <Video className="h-4 w-4 mr-1.5 text-blue-500" />
                            <span className="text-xs font-medium">Video</span>
                          </Button>
                          <Button 
                            type="button"
                            variant={newLessonType === "quiz" ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setNewLessonType("quiz")}
                            className={`h-7 px-2 rounded-md ${newLessonType === "quiz" ? "bg-gray-100" : ""}`}
                          >
                            <HelpCircle className="h-4 w-4 mr-1.5 text-orange-500" />
                            <span className="text-xs font-medium">Quiz</span>
                          </Button>
                        </div>
                        
                        <input
                          type="text"
                          placeholder={dictionary.builder_lesson_name_placeholder}
                          className="flex-1 h-9 rounded-lg border-gray-200 text-sm px-3 focus:ring-red-500 focus:border-red-500 outline-none border shadow-sm"
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateLesson(section.id)}
                          autoFocus
                        />
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => handleCreateLesson(section.id)} className="bg-red-500 hover:bg-red-600 rounded-full px-6">{dictionary.builder_save}</Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setAddingLessonToSection(null)
                            setNewLessonTitle("")
                            setNewLessonUrl("")
                          }} className="rounded-full px-4">{dictionary.builder_cancel}</Button>
                        </div>
                      </div>
                    </div>
                  ) : !isPublished ? (
                    <div className="p-3 pl-12 bg-white">
                      <Button variant="ghost" size="sm" onClick={() => setAddingLessonToSection(section.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full">
                        <Plus className="h-4 w-4 mr-2" />
                        {dictionary.builder_add_lesson}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            )
          })}

          {!isPublished && (addingSection ? (
            <Card className="rounded-2xl border-dashed border-2 border-red-200 bg-red-50/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder={dictionary.builder_new_section_placeholder}
                    className="flex-1 h-11 rounded-xl border-gray-200 text-base px-4 focus:ring-red-500 focus:border-red-500 outline-none border shadow-sm"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()}
                    autoFocus
                  />
                  <Button onClick={handleCreateSection} className="h-11 px-6 bg-red-500 hover:bg-red-600 rounded-full text-base font-medium shadow-sm">{dictionary.builder_create_first}</Button>
                  <Button variant="ghost" onClick={() => setAddingSection(false)} className="h-11 px-6 rounded-full text-gray-500">{dictionary.builder_cancel}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" onClick={() => setAddingSection(true)} className="w-full h-14 border-dashed border-2 border-gray-200 text-gray-500 hover:border-red-500 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
              <Plus className="h-5 w-5 mr-2" />
              {dictionary.builder_create_more}
            </Button>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">{dictionary.builder_delete_title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              {deleteConfirm?.type === 'section' 
                ? dictionary.builder_delete_section_warning 
                : dictionary.builder_delete_lesson_warning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel className="rounded-full px-6 h-11">{dictionary.builder_cancel}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }} 
              className="rounded-full px-6 h-11 bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {dictionary.builder_delete_confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  )
}
