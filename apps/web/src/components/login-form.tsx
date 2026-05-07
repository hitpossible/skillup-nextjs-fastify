import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { redirect } from "next/navigation"
import { loginAction } from "@/lib/auth"
import Image from "next/image"
import logo from "../../public/logos/skillup-logo.png"

async function handleLogin(formData: FormData) {
  "use server"
  const username = formData.get("username") as string
  const password = formData.get("password") as string
  const locale = (formData.get("locale") as string) || "th"
  try {
    await loginAction(username, password)
  } catch {
    redirect(`/${locale}/login?error=1`)
  }
  redirect(`/${locale}/dashboard`)
}

interface LoginFormProps {
  className?: string
  error?: boolean
  dictionary: any
  locale: string
}

export function LoginForm({ className, error, dictionary, locale }: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-10 flex flex-col items-center">
          <div className="flex flex-col items-center gap-1 mb-8">
            <Image 
              src={logo} 
              alt="SkillUp Logo" 
              width={180} 
              height={48} 
              className="h-12 w-auto mb-2"
              priority
            />
            <p className="text-[13px] font-bold text-[#1a1a1a]">
              {dictionary.tagline}
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-4">
            <a href="/th/login" className={cn("text-xs font-bold px-2 py-1 rounded", locale === "th" ? "bg-red-50 text-red-500" : "text-gray-400")}>TH</a>
            <a href="/en/login" className={cn("text-xs font-bold px-2 py-1 rounded", locale === "en" ? "bg-red-50 text-red-500" : "text-gray-400")}>EN</a>
          </div>

          <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-6">{dictionary.login}</h2>

          <form action={handleLogin} className="w-full space-y-5">
            <input type="hidden" name="locale" value={locale} />
            {error && (
              <p className="text-center text-sm text-red-500 bg-red-50 py-2 rounded-lg mb-4">
                {dictionary.error_invalid}
              </p>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-bold flex items-center gap-1">
                {dictionary.username} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={dictionary.placeholder_username}
                required
                className="h-12 rounded-xl border-gray-200 focus-visible:ring-gray-200"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold flex items-center gap-1">
                  {dictionary.password} <span className="text-red-500">*</span>
                </Label>
                <a href="#" className="text-xs font-bold text-gray-400 hover:text-gray-600">
                  {dictionary.forgot_password}
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={dictionary.placeholder_password}
                required
                className="h-12 rounded-xl border-gray-200 focus-visible:ring-gray-200"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-full bg-[#FF3333] hover:bg-[#E62E2E] text-white font-bold text-base transition-all duration-200 shadow-lg shadow-red-200"
              >
                {dictionary.submit_login}
              </Button>
            </div>

            {/* <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-400 font-medium uppercase tracking-wider">{dictionary.or}</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <Button 
              variant="outline" 
              type="button" 
              className="w-full h-12 rounded-full border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {dictionary.login_with_google}
            </Button>

            <p className="text-center text-sm font-bold text-gray-700 pt-2">
              {dictionary.no_account} <a href="#" className="text-[#FF3333] hover:underline">{dictionary.create_account}</a>
            </p> */}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
