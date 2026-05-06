"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, Globe } from "lucide-react"
import { publishCourseAction } from "./actions"
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

export function PublishButton({ 
  courseId, 
  disabled,
  dictionary
}: { 
  courseId: string, 
  disabled: boolean,
  dictionary: any
}) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handlePublish = async () => {
    setLoading(true)
    const result = await publishCourseAction(courseId)
    setLoading(false)
    
    if (result && result.error) {
      toast({
        variant: "destructive",
        title: dictionary.publish_error,
        description: result.error,
      })
      setOpen(false)
      return
    }
    
    toast({
      title: dictionary.publish_success_title,
      description: dictionary.publish_success_desc,
    })
    setOpen(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled || loading} className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 shadow-sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
          {dictionary.publish_button}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <AlertDialogTitle className="text-center text-xl">{dictionary.publish_title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {dictionary.publish_desc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
          <AlertDialogCancel className="rounded-full px-6 h-11">{dictionary.builder_cancel}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handlePublish();
            }} 
            className="rounded-full px-6 h-11 bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {dictionary.publish_confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
