"use client"

import { useState } from "react"
import { Award, CalendarDays, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CertificateModal } from "@/app/[locale]/learn/[courseId]/certificate-modal"

interface Certificate {
  id: string
  certificateNumber: string
  issuedAt: string
  expiresAt: string | null
  course: { id: string; title: string }
}

interface Props {
  certificates: Certificate[]
  holderName: string
  dictionary: any
  locale: string
}

export function CertificatesBrowser({ certificates, holderName, dictionary, locale }: Props) {
  const [selected, setSelected] = useState<Certificate | null>(null)
  const d = dictionary.learn

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <Award className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {dictionary.nav?.certificates || "ใบประกาศนียบัตรของฉัน"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {certificates.length > 0
                  ? `${certificates.length} ใบประกาศนียบัตร`
                  : "ยังไม่มีใบประกาศนียบัตร"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-5 bg-gray-100 rounded-full mb-5">
              <Award className="h-12 w-12 text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-500 mb-2">ยังไม่มีใบประกาศนียบัตร</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              เมื่อคุณเรียนจบหลักสูตรครบ ระบบจะออกใบประกาศนียบัตรให้อัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Top accent */}
                <div className="h-1.5 bg-gradient-to-r from-[#fa080a] to-[#ff4d4f]" />

                <div className="p-5">
                  {/* Course title */}
                  <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-4 line-clamp-2">
                    {cert.course.title}
                  </h3>

                  {/* Meta */}
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="font-mono text-xs font-semibold text-gray-600">
                        {cert.certificateNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="text-xs font-medium">{formatDate(cert.issuedAt)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelected(cert)}
                    className="w-full rounded-xl h-10 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold gap-2"
                  >
                    <Award className="h-4 w-4" />
                    {d?.view_certificate || "ดูใบประกาศ"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <CertificateModal
          certificate={selected}
          holderName={holderName}
          onClose={() => setSelected(null)}
          dictionary={d}
        />
      )}
    </div>
  )
}
