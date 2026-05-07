"use client"

import { useRef } from "react"
import {
  X,
  Printer,
  BadgeCheck,
  Sparkles,
  ShieldCheck,
  Signature,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Certificate {
  certificateNumber: string
  issuedAt: string
  course: {
    title: string
  }
}

interface Props {
  certificate: Certificate
  holderName: string
  onClose: () => void
  dictionary: any

  /**
   * ใส่ URL logo ระบบ เช่น "/images/logo.png"
   * English: System logo URL, for example "/images/logo.png"
   */
  systemLogoUrl?: string

  /**
   * ชื่อระบบ เช่น "QMW System", "FA Academy"
   * English: System name shown beside the logo
   */
  systemName?: string
}

const ACCENT = "#fa080a"

export function CertificateModal({
  certificate,
  holderName,
  onClose,
  dictionary,
  systemLogoUrl = "/logos/skillup-logo.png",
  systemName = "TBKK SkillUp",
}: Props) {
  const certRef = useRef<HTMLDivElement>(null)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const escapeHtml = (value: string) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")

  const renderPrintLogo = () => {
    const safeSystemName = escapeHtml(systemName)

    if (systemLogoUrl) {
      return `
        <div class="brand-logo brand-logo-image">
          <img src="${escapeHtml(systemLogoUrl)}" alt="${safeSystemName}" />
        </div>
      `
    }

    return `
      <div class="brand-logo brand-logo-fallback">
        <span>S</span>
      </div>
    `
  }

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1280,height=900")
    if (!win) return

    const safeHolderName = escapeHtml(holderName)
    const safeCourseTitle = escapeHtml(certificate.course.title)
    const safeCertificateNumber = escapeHtml(certificate.certificateNumber)
    const safeIssuedDate = escapeHtml(formatDate(certificate.issuedAt))
    const safeSystemName = escapeHtml(systemName)

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Certificate — ${safeCourseTitle}</title>

  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    :root {
      --accent: ${ACCENT};
      --ink: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --soft: #f9fafb;
    }

    body {
      width: 100vw;
      min-height: 100vh;
      background:
        radial-gradient(circle at 8% 10%, rgba(250, 8, 10, 0.09), transparent 28%),
        radial-gradient(circle at 92% 86%, rgba(250, 8, 10, 0.08), transparent 30%),
        #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      color: var(--ink);
    }

    .page {
      width: 1123px;
      height: 794px;
      padding: 28px;
    }

    .certificate {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 28px;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96)),
        #ffffff;
      border: 1px solid rgba(17, 24, 39, 0.08);
      box-shadow:
        0 34px 90px rgba(17, 24, 39, 0.18),
        inset 0 0 0 1px rgba(255,255,255,0.9);
    }

    .certificate::before {
      content: "";
      position: absolute;
      inset: 22px;
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 22px;
      pointer-events: none;
      z-index: 3;
    }

    .accent-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, var(--accent), #ff4d4f, var(--accent));
      z-index: 4;
    }

    .shape-one {
      position: absolute;
      right: -92px;
      top: -92px;
      width: 260px;
      height: 260px;
      border-radius: 999px;
      background: rgba(250, 8, 10, 0.075);
    }

    .shape-two {
      position: absolute;
      left: -80px;
      bottom: -80px;
      width: 220px;
      height: 220px;
      border-radius: 999px;
      border: 34px solid rgba(250, 8, 10, 0.055);
    }

    .side-code {
      position: absolute;
      left: 28px;
      top: 118px;
      bottom: 118px;
      width: 1px;
      background: linear-gradient(180deg, transparent, rgba(250, 8, 10, 0.45), transparent);
    }

    .side-code::before {
      content: "CERTIFIED";
      position: absolute;
      left: -30px;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      color: rgba(250, 8, 10, 0.62);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.32em;
    }

    .watermark {
      position: absolute;
      right: 72px;
      bottom: 54px;
      font-size: 112px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: -0.08em;
      color: rgba(17, 24, 39, 0.028);
      user-select: none;
      pointer-events: none;
    }

    .content {
      position: relative;
      z-index: 5;
      height: 100%;
      padding: 54px 72px 48px;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 54px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .brand-logo {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex: 0 0 auto;
      background:
        linear-gradient(135deg, rgba(250, 8, 10, 0.12), rgba(250, 8, 10, 0.04)),
        #ffffff;
      border: 1px solid rgba(250, 8, 10, 0.2);
      box-shadow: 0 16px 36px rgba(250, 8, 10, 0.12);
    }

    .brand-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }

    .brand-logo-fallback {
      background: linear-gradient(135deg, var(--accent), #bf0608);
      color: white;
      font-weight: 950;
      font-size: 23px;
      letter-spacing: -0.04em;
    }

    .brand-text {
      min-width: 0;
    }

    .brand-name {
      font-size: 14px;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
    }

    .brand-sub {
      margin-top: 3px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.22em;
      color: #9ca3af;
      text-transform: uppercase;
    }

    .meta-pill {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 10px 14px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid rgba(17, 24, 39, 0.08);
      box-shadow: 0 12px 28px rgba(17, 24, 39, 0.06);
      color: #374151;
      font-size: 12px;
      font-weight: 800;
    }

    .meta-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 5px rgba(250, 8, 10, 0.1);
    }

    .main {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 42px;
      align-items: center;
      flex: 1;
    }

    .left {
      min-width: 0;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(250, 8, 10, 0.075);
      color: var(--accent);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 22px;
    }

    .eyebrow-mark {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      letter-spacing: 0;
    }

    .title {
      font-size: 58px;
      line-height: 0.96;
      font-weight: 950;
      letter-spacing: -0.065em;
      color: #111827;
      margin-bottom: 18px;
    }

    .title span {
      color: var(--accent);
    }

    .description {
      width: 86%;
      color: #6b7280;
      font-size: 15px;
      line-height: 1.65;
      font-weight: 500;
      margin-bottom: 34px;
    }

    .recipient-label {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: #9ca3af;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .recipient {
      display: inline-block;
      max-width: 100%;
      color: #111827;
      font-size: 44px;
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: -0.055em;
      border-bottom: 5px solid var(--accent);
      padding-bottom: 8px;
      margin-bottom: 24px;
    }

    .course-panel {
      border-radius: 24px;
      padding: 26px;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.96), rgba(249,250,251,0.96));
      border: 1px solid rgba(17, 24, 39, 0.08);
      box-shadow: 0 18px 50px rgba(17, 24, 39, 0.075);
      position: relative;
      overflow: hidden;
    }

    .course-panel::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--accent), rgba(250, 8, 10, 0.2));
    }

    .course-label {
      color: #9ca3af;
      font-size: 10px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin-bottom: 11px;
    }

    .course-title {
      color: #111827;
      font-size: 24px;
      line-height: 1.25;
      font-weight: 900;
      letter-spacing: -0.025em;
    }

    .right {
      border-radius: 30px;
      padding: 30px;
      background:
        radial-gradient(circle at top right, rgba(250, 8, 10, 0.12), transparent 36%),
        linear-gradient(180deg, #111827, #171717);
      color: white;
      box-shadow: 0 28px 70px rgba(17, 24, 39, 0.22);
      min-height: 390px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .right::before {
      content: "";
      position: absolute;
      inset: 18px;
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.1);
      pointer-events: none;
    }

    .right-top {
      position: relative;
      z-index: 1;
    }

    .verified-badge {
      width: 66px;
      height: 66px;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(250, 8, 10, 0.95);
      box-shadow: 0 18px 40px rgba(250, 8, 10, 0.25);
      margin-bottom: 24px;
    }

    .right-title {
      font-size: 30px;
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: -0.055em;
      margin-bottom: 12px;
    }

    .right-desc {
      color: rgba(255,255,255,0.62);
      font-size: 13px;
      line-height: 1.65;
      font-weight: 500;
    }

    .info-grid {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 12px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 0;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .info-label {
      color: rgba(255,255,255,0.46);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .info-value {
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      text-align: right;
    }

    .mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }

    .footer {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 30px;
      align-items: end;
      margin-top: 42px;
      padding-top: 28px;
      border-top: 1px solid rgba(17, 24, 39, 0.08);
    }

    .footer-note {
      color: #9ca3af;
      font-size: 11px;
      line-height: 1.6;
      font-weight: 600;
    }

    .signature {
      text-align: center;
    }

    .signature-line {
      height: 1px;
      background: #111827;
      margin-bottom: 10px;
    }

    .signature-title {
      color: #111827;
      font-size: 12px;
      font-weight: 900;
    }

    .signature-sub {
      margin-top: 3px;
      color: #9ca3af;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    @media print {
      body {
        background: #ffffff;
        width: 297mm;
        height: 210mm;
      }

      .page {
        width: 297mm;
        height: 210mm;
        padding: 0;
      }

      .certificate {
        width: 297mm;
        height: 210mm;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="certificate">
      <div class="accent-top"></div>
      <div class="shape-one"></div>
      <div class="shape-two"></div>
      <div class="side-code"></div>
      <div class="watermark">01</div>

      <div class="content">
        <header class="header">
          <div class="brand">
            ${renderPrintLogo()}
            <div class="brand-text">
              <div class="brand-name">${safeSystemName}</div>
              <div class="brand-sub">Learning Platform</div>
            </div>
          </div>

          <div class="meta-pill">
            <span class="meta-dot"></span>
            Verified Certificate
          </div>
        </header>

        <main class="main">
          <section class="left">
            <div class="eyebrow">
              <span class="eyebrow-mark">✓</span>
              Certificate of Completion
            </div>

            <h1 class="title">
              Certified<br />
              <span>Achievement</span>
            </h1>

            <p class="description">
              This certificate is proudly presented in recognition of successful completion,
              commitment, and demonstrated learning achievement.
            </p>

            <div class="recipient-label">Presented to</div>
            <div class="recipient">${safeHolderName}</div>

            <div class="course-panel">
              <div class="course-label">Completed Course</div>
              <div class="course-title">${safeCourseTitle}</div>
            </div>
          </section>

          <aside class="right">
            <div class="right-top">
              <div class="verified-badge">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              </div>

              <div class="right-title">
                Official<br />
                Recognition
              </div>

              <p class="right-desc">
                Issued by the system after completion criteria have been met and verified.
              </p>
            </div>

            <div class="info-grid">
              <div class="info-row">
                <div class="info-label">Certificate No.</div>
                <div class="info-value mono">${safeCertificateNumber}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Issued Date</div>
                <div class="info-value">${safeIssuedDate}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Status</div>
                <div class="info-value">Verified</div>
              </div>
            </div>
          </aside>
        </main>

        <footer class="footer">
          <p class="footer-note">
            This document is generated electronically by ${safeSystemName}.
            The certificate number can be used for internal verification and audit reference.
          </p>

          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-title">Authorized Signature</div>
            <div class="signature-sub">Training Administrator</div>
          </div>
        </footer>
      </div>
    </div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print()
        window.close()
      }, 500)
    }
  </script>
</body>
</html>`)

    win.document.close()
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#050505]/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="relative w-full max-w-6xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close button */}
        <div className="mb-3 flex justify-end px-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close certificate"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Certificate Preview */}
        <div
          ref={certRef}
          className="relative aspect-[1.414/1] w-full overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl"
        >
          {/* Accent / Background */}
          <div className="absolute inset-x-0 top-0 z-20 h-2 bg-gradient-to-r from-[#fa080a] via-[#ff4d4f] to-[#fa080a]" />
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#fa080a]/[0.075]" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full border-[34px] border-[#fa080a]/[0.055]" />
          <div className="absolute inset-[2.7%] rounded-[22px] border border-gray-900/[0.07]" />
          <div className="absolute bottom-[7%] right-[7%] select-none text-[clamp(56px,10vw,112px)] font-black leading-none tracking-[-0.08em] text-gray-950/[0.028]">
            01
          </div>

          {/* Side certified line */}
          <div className="absolute bottom-[15%] left-[2.7%] top-[15%] w-px bg-gradient-to-b from-transparent via-[#fa080a]/45 to-transparent">
            <div className="absolute left-[-30px] top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black uppercase tracking-[0.32em] text-[#fa080a]/65">
              Certified
            </div>
          </div>

          <div className="relative z-10 flex h-full flex-col px-[6.8%] pb-[4.8%] pt-[5.2%]">
            {/* Header */}
            <div className="mb-[4.8%] flex items-center justify-between gap-6">
              <div className="flex min-w-0 items-center gap-3.5">
                {systemLogoUrl ? (
                  <div className="flex h-[clamp(42px,4.8vw,54px)] w-[clamp(42px,4.8vw,54px)] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#fa080a]/20 bg-white shadow-[0_16px_36px_rgba(250,8,10,0.12)]">
                    <img
                      src={systemLogoUrl}
                      alt={systemName}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="flex h-[clamp(42px,4.8vw,54px)] w-[clamp(42px,4.8vw,54px)] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fa080a] to-[#bf0608] text-[clamp(18px,2vw,23px)] font-black tracking-[-0.04em] text-white shadow-[0_16px_36px_rgba(250,8,10,0.18)]">
                    S
                  </div>
                )}

                <div className="min-w-0">
                  <div className="max-w-[340px] truncate text-[clamp(12px,1.25vw,14px)] font-black tracking-[-0.02em] text-gray-950">
                    {systemName}
                  </div>
                  <div className="mt-0.5 text-[clamp(8px,0.9vw,10px)] font-extrabold uppercase tracking-[0.22em] text-gray-400">
                    Learning Platform
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-gray-900/[0.08] bg-white px-3.5 py-2 text-[clamp(10px,1vw,12px)] font-extrabold text-gray-700 shadow-[0_12px_28px_rgba(17,24,39,0.06)]">
                <span className="h-2 w-2 rounded-full bg-[#fa080a] shadow-[0_0_0_5px_rgba(250,8,10,0.1)]" />
                Verified Certificate
              </div>
            </div>

            {/* Main */}
            <div className="grid flex-1 grid-cols-[1.05fr_0.95fr] items-center gap-[4%]">
              {/* Left */}
              <div className="min-w-0">
                <div className="mb-[4%] inline-flex items-center gap-2 rounded-full bg-[#fa080a]/[0.075] px-3 py-2 text-[clamp(9px,1vw,11px)] font-black uppercase tracking-[0.18em] text-[#fa080a]">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#fa080a] text-xs text-white">
                    ✓
                  </span>
                  Certificate of Completion
                </div>

                <h1 className="mb-[3.5%] text-[clamp(38px,5.2vw,58px)] font-black leading-[0.96] tracking-[-0.065em] text-gray-950">
                  Certified
                  <br />
                  <span className="text-[#fa080a]">Achievement</span>
                </h1>

                <p className="mb-[5%] w-[86%] text-[clamp(11px,1.25vw,15px)] font-medium leading-relaxed text-gray-500">
                  This certificate is proudly presented in recognition of
                  successful completion, commitment, and demonstrated learning
                  achievement.
                </p>

                <div className="mb-2 text-[clamp(9px,1vw,11px)] font-black uppercase tracking-[0.18em] text-gray-400">
                  Presented to
                </div>

                <div className="mb-[4%] inline-block max-w-full border-b-[5px] border-[#fa080a] pb-2 text-[clamp(30px,4vw,44px)] font-black leading-tight tracking-[-0.055em] text-gray-950">
                  {holderName}
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-gray-900/[0.08] bg-gradient-to-br from-white to-gray-50 p-[clamp(18px,2.35vw,26px)] shadow-[0_18px_50px_rgba(17,24,39,0.075)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#fa080a] to-[#fa080a]/20" />

                  <div className="mb-2.5 text-[clamp(8px,0.9vw,10px)] font-black uppercase tracking-[0.18em] text-gray-400">
                    Completed Course
                  </div>

                  <h3 className="text-[clamp(17px,2.15vw,24px)] font-black leading-snug tracking-[-0.025em] text-gray-950">
                    {certificate.course.title}
                  </h3>
                </div>
              </div>

              {/* Right */}
              <div className="relative flex min-h-[clamp(310px,35vw,390px)] flex-col justify-between overflow-hidden rounded-[30px] bg-gradient-to-b from-gray-950 to-[#171717] p-[clamp(22px,2.7vw,30px)] text-white shadow-[0_28px_70px_rgba(17,24,39,0.22)]">
                <div className="absolute right-[-52px] top-[-52px] h-44 w-44 rounded-full bg-[#fa080a]/20 blur-sm" />
                <div className="absolute inset-[18px] rounded-[22px] border border-white/10" />

                <div className="relative z-10">
                  <div className="mb-[8%] flex h-[clamp(54px,5.8vw,66px)] w-[clamp(54px,5.8vw,66px)] items-center justify-center rounded-[22px] bg-[#fa080a] shadow-[0_18px_40px_rgba(250,8,10,0.25)]">
                    <BadgeCheck className="h-[52%] w-[52%] text-white" />
                  </div>

                  <div className="mb-3 text-[clamp(22px,2.7vw,30px)] font-black leading-[1.05] tracking-[-0.055em]">
                    Official
                    <br />
                    Recognition
                  </div>

                  <p className="max-w-[90%] text-[clamp(10px,1.1vw,13px)] font-medium leading-relaxed text-white/60">
                    Issued by the system after completion criteria have been met
                    and verified.
                  </p>
                </div>

                <div className="relative z-10 grid gap-0">
                  <div className="flex justify-between gap-4 border-t border-white/10 py-3.5">
                    <div className="text-[clamp(8px,0.85vw,10px)] font-black uppercase tracking-[0.16em] text-white/45">
                      Certificate No.
                    </div>
                    <div className="text-right font-mono text-[clamp(10px,1.1vw,13px)] font-extrabold text-white">
                      {certificate.certificateNumber}
                    </div>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-white/10 py-3.5">
                    <div className="text-[clamp(8px,0.85vw,10px)] font-black uppercase tracking-[0.16em] text-white/45">
                      Issued Date
                    </div>
                    <div className="text-right text-[clamp(10px,1.1vw,13px)] font-extrabold text-white">
                      {formatDate(certificate.issuedAt)}
                    </div>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-white/10 py-3.5">
                    <div className="text-[clamp(8px,0.85vw,10px)] font-black uppercase tracking-[0.16em] text-white/45">
                      Status
                    </div>
                    <div className="inline-flex items-center justify-end gap-1.5 text-right text-[clamp(10px,1.1vw,13px)] font-extrabold text-white">
                      <ShieldCheck className="h-4 w-4 text-[#fa080a]" />
                      Verified
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-[4%] grid grid-cols-[1fr_260px] items-end gap-8 border-t border-gray-900/[0.08] pt-[2.7%]">
              <div className="flex items-start gap-2 text-[clamp(9px,0.95vw,11px)] font-semibold leading-relaxed text-gray-400">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#fa080a]" />
                <span>
                  This document is generated electronically by {systemName}. The
                  certificate number can be used for internal verification and
                  audit reference.
                </span>
              </div>

              <div className="text-center">
                <div className="mb-2 h-px bg-gray-950" />
                <div className="flex items-center justify-center gap-1.5 text-[clamp(10px,1vw,12px)] font-black text-gray-950">
                  <Signature className="h-4 w-4 text-[#fa080a]" />
                  Authorized Signature
                </div>
                <div className="mt-1 text-[clamp(8px,0.85vw,10px)] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                  Training Administrator
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            onClick={handlePrint}
            className="gap-2 rounded-full bg-white px-6 font-bold text-gray-900 shadow-sm hover:bg-gray-100"
          >
            <Printer className="h-4 w-4" />
            {dictionary?.print_certificate || "พิมพ์ / บันทึก PDF"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full px-5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ปิด
          </Button>
        </div>
      </div>
      </div>
    </div>
  )
}