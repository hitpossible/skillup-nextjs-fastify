import { redirect } from "next/navigation";
import { getAccessToken, getSession, hasRole } from "@/lib/auth";
import { apiFetch, getFullImageUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, GraduationCap, Award, TrendingUp, PlayCircle, Plus, LayoutGrid, ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/lib/i18n-config";
import { PodiumRanking } from "@/components/podium-ranking";

interface EnrollmentsResponse {
  data: any[];
  meta: { total: number };
}

export const metadata = { title: "Dashboard — SkillUp" };

export default async function DashboardPage({
  params: { locale }
}: {
  params: { locale: Locale }
}) {
  const [token, session] = await Promise.all([getAccessToken(), getSession()]);
  if (!session || !token) redirect(`/${locale}/login`);

  const displayName = session.email.split("@")[0];
  const dict = await getDictionary(locale);

  const [result, leaderboard] = await Promise.all([
    apiFetch<EnrollmentsResponse>(
      `/users/${session.sub}/enrollments?limit=100`,
      { token, cache: "no-store" }
    ),
    apiFetch<{ rank: number; userId: string; name: string; completedCourses: number }[]>(
      `/analytics/leaderboard`,
      { token, cache: "no-store" }
    ).catch(() => [] as { rank: number; userId: string; name: string; completedCourses: number }[]),
  ]);

  const enrollments = result.data || [];
  const active = enrollments.filter((e) => e.status === "active").length;
  const completed = enrollments.filter((e) => e.status === "completed").length;
  const avgProgress =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollments.length)
      : 0;

  const recent = enrollments.slice(0, 5);
  const isInstructor = hasRole(session, "admin", "instructor");

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {dict.dashboard.welcome}, <span className="text-red-500">{displayName}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-2">{dict.dashboard.subtitle}</p>
        </div>
        {isInstructor && (
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/course/list`}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              {dict.dashboard.manage_course}
            </Link>
            <Link
              href={`/${locale}/course/create`}
              className="inline-flex items-center justify-center rounded-full bg-red-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-600 transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              {dict.dashboard.create_course}
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-[24px] border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-500">{dict.dashboard.active_courses}</CardTitle>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold text-gray-900">{active}</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-[24px] border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <GraduationCap className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-500">{dict.dashboard.completed_courses}</CardTitle>
            <div className="p-2 bg-green-50 text-green-500 rounded-xl">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold text-gray-900">{completed}</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-500">{dict.dashboard.all_courses}</CardTitle>
            <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold text-gray-900">{enrollments.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-500">{dict.dashboard.avg_progress}</CardTitle>
            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold text-gray-900">{avgProgress}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Enrollments + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* Recent Enrollments */}
      <Card className="rounded-[24px] border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 border-b border-gray-100 px-6 py-5">
          <CardTitle className="text-lg font-semibold text-gray-900">{dict.dashboard.recent_enrollments}</CardTitle>
          <Link href={`/${locale}/my-courses`} className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
            {dict.dashboard.view_all} <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{dict.dashboard.no_recent}</h3>
              <p className="text-sm text-gray-500 mb-6">{dict.dashboard.find_course}</p>
              <Link
                href={`/${locale}/catalog`}
                className="inline-flex items-center justify-center rounded-full bg-red-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-600 transition-all"
              >
                {dict.dashboard.start_first}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((e) => {
                const isCompleted = e.status === "completed" || e.progressPercent === 100;
                return (
                  <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="h-16 w-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative">
                      {e.course?.thumbnailUrl ? (
                        <img src={getFullImageUrl(e.course.thumbnailUrl)} alt={e.course?.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
                          <BookOpen className="h-6 w-6 text-red-300" />
                        </div>
                      )}
                      {isCompleted && (
                        <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center backdrop-blur-[1px]">
                           <Award className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/learn/${e.courseId}`}
                        className="text-base font-semibold text-gray-900 hover:text-red-500 transition-colors truncate block"
                      >
                        {e.course?.title ?? `Course #${e.courseId}`}
                      </Link>
                      <div className="flex items-center gap-3 mt-2 max-w-md">
                        <Progress 
                          value={e.progressPercent} 
                          className="h-2 flex-1 bg-gray-100 [&>[data-slot=indicator]]:bg-red-500" 
                        />
                        <span className="text-xs font-medium text-gray-500 w-10 text-right">
                          {e.progressPercent}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={isCompleted ? "default" : "secondary"}
                        className={isCompleted 
                          ? "bg-green-100 text-green-700 hover:bg-green-200 border-transparent" 
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-transparent"}
                      >
                        {isCompleted ? "จบแล้ว" : "กำลังเรียน"}
                      </Badge>
                      <Link
                        href={`/learn/${e.courseId}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <PlayCircle className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card className="rounded-[24px] border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100/60 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">{dict.dashboard.leaderboard_title}</CardTitle>
              <p className="text-xs text-amber-700/70 mt-0.5">{dict.dashboard.leaderboard_subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <PodiumRanking entries={leaderboard} dictionary={dict.dashboard} />
        </CardContent>
      </Card>

      </div>
    </div>
  );
}
