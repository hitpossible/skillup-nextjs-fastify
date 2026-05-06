"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, EyeOff } from "lucide-react"
import { unpublishCourseAction } from "./actions"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function UnpublishButton({ 
  courseId,
  dictionary
}: { 
  courseId: string,
  dictionary: any
}) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleUnpublish = async () => {
    setLoading(true)
    const result = await unpublishCourseAction(courseId)
    setLoading(false)

    if (result?.error) {
      toast({
        variant: "destructive",
        title: dictionary.error_title,
        description: result.error,
      })
      setOpen(false)
      return
    }

    toast({
      title: dictionary.unpublish_success_title,
      description: dictionary.unpublish_success_desc,
    })
    setOpen(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          disabled={loading}
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-50 rounded-full px-6 shadow-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <EyeOff className="h-4 w-4 mr-2" />}
          {dictionary.unpublish_button}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 mb-2">
            <EyeOff className="h-6 w-6 text-orange-600" />
          </div>
          <AlertDialogTitle className="text-center text-xl">{dictionary.unpublish_title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {dictionary.unpublish_desc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
          <AlertDialogCancel className="rounded-full px-6 h-11">{dictionary.builder_cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleUnpublish()
            }}
            className="rounded-full px-6 h-11 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {dictionary.unpublish_confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
