'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  ChevronDown,
  ChevronRight,
  LogOut,
  Bell,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  BookOpen,
  UploadCloud,
  Award,
  Layers,
  GraduationCap,
  ExternalLink,
  Download,
  Calendar,
  Clock,
  Menu,
  X,
  ShieldCheck,
  Building,
  Activity,
  Sliders,
  PhoneCall,
  Sparkles
} from 'lucide-react';

import MmmutLogo from './MmmutLogo';
import VedInsights from './ved/VedInsights';
import VedOperations from './ved/VedOperations';
import VedDocuments from './ved/VedDocuments';

interface StudentDashboardProps {
  studentRoll: string;
  initialUser?: any;
  onLogout: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function StudentDashboard({
  studentRoll = '2023CSD0622',
  initialUser,
  onLogout
}: StudentDashboardProps) {
  // Dynamic user data
  const [currentUser, setCurrentUser] = useState<any>(initialUser || null);

  // Dynamic telephony provider status
  const [telephonyStatus, setTelephonyStatus] = useState<{ provider: string; exotelConfigured?: boolean; twilioConfigured?: boolean }>({
    provider: 'exotel'
  });

  // Dynamic helpline number
  const [primaryHelpline, setPrimaryHelpline] = useState<string>('+91 63069 87592');

  // Navigation states: default to VED Insights
  const [activeTab, setActiveTab] = useState<'Insights' | 'Operations' | 'Documents' | 'StudentPortal' | 'ProgramDetails'>('Insights');
  const [activeSubheading, setActiveSubheading] = useState<string>('Overview & KPIs');

  // Accordion states for the 3 VED Nav Items + Student Portal
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [studentPortalOpen, setStudentPortalOpen] = useState(false);

  // Mobile drawer & profile dropdown
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ABC Modal
  const [showAbcModal, setShowAbcModal] = useState(false);
  const [abcLinked, setAbcLinked] = useState(false);
  const [abcIdInput, setAbcIdInput] = useState('APAAR-9823-4120-7761');

  // Load live user data from token or storage
  useEffect(() => {
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        setCurrentUser(parsed);
      } catch {
        // ignore
      }
    }

    const token = localStorage.getItem('token');
    if (token && !token.startsWith('session_token_')) {
      fetch(`${BACKEND_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setCurrentUser(data);
            localStorage.setItem('user', JSON.stringify(data));
          }
        })
        .catch(() => {});
    }

    // Fetch live telephony provider status (Exotel vs Twilio)
    fetch(`${BACKEND_URL}/api/telephony/status`)
      .then(res => res.json())
      .then(data => {
        if (data.provider) setTelephonyStatus(data);
      })
      .catch(() => {});

    // Fetch live numbers from pool
    fetch(`${BACKEND_URL}/api/ved/numbers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.numbers) && data.numbers.length > 0) {
          setPrimaryHelpline(data.numbers[0].number);
        }
      })
      .catch(() => {});
  }, []);

  // Resolved dynamic student details
  const studentData = {
    name: currentUser?.name || 'Suyash Rai',
    rollNumber: currentUser?.rollNumber || studentRoll,
    enrollmentNo: currentUser?.enrollmentNo || `MMMUT/${new Date().getFullYear()}/CS/0622`,
    department: currentUser?.department || 'Computer Science and Engineering',
    program: currentUser?.program || 'B.TECH.(CSE) : BACHELOR OF TECHNOLOGY(COMPUTER SCIENCE AND ENGINEERING)',
    semester: currentUser?.semester || '6th Semester',
    batch: currentUser?.batch || '2023 - 2027',
    email: currentUser?.email || `${studentRoll.toLowerCase()}@mmmut.ac.in`,
    role: currentUser?.role || 'student',
    cgpa: currentUser?.cgpa || '8.46',
    attendance: currentUser?.attendance || '89.2%'
  };

  const navItems = [
    {
      id: 'Insights',
      title: 'VED Insights',
      icon: Activity,
      isOpen: insightsOpen,
      setIsOpen: setInsightsOpen,
      subheadings: ['Overview & KPIs', 'Questions & FAQs', 'Trends & Performance']
    },
    {
      id: 'Operations',
      title: 'VED Operations',
      icon: Sliders,
      isOpen: operationsOpen,
      setIsOpen: setOperationsOpen,
      subheadings: ['Numbers Pool & Priority', 'System Prompt Config', 'Live Test Dialer']
    },
    {
      id: 'Documents',
      title: 'VED Documents',
      icon: BookOpen,
      isOpen: documentsOpen,
      setIsOpen: setDocumentsOpen,
      subheadings: ['Knowledge Base Documents', 'Upload Document / Syllabus', 'Document Inspector']
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#edf0f5] text-slate-800 font-sans antialiased">
      {/* Top Navigation Bar with College Logo replacing "SU" */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs h-15 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* College Logo & University Title (Replaced SU as requested) */}
          <div
            onClick={() => { setActiveTab('Insights'); setActiveSubheading('Overview & KPIs'); }}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <MmmutLogo size={42} className="shrink-0 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-slate-900 font-bold text-xs sm:text-sm tracking-tight leading-tight">
                Madan Mohan Malaviya University of Technology
              </span>
              <span className="text-[11px] font-medium text-[#2563eb] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                VED AI Voice Assistance Portal
              </span>
            </div>
          </div>
        </div>

        {/* Right Student/Admin Profile Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {telephonyStatus.provider === 'exotel' ? 'Exotel Active' : 'Twilio Active'}
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-white shadow-xs">
                <User className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                {studentRoll}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{studentData.name}</p>
                  <p className="text-[11px] text-slate-500">{studentData.rollNumber}</p>
                  <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                    MMMUT VED Admin
                  </span>
                </div>
                <button
                  onClick={() => { setActiveTab('StudentPortal'); setUserMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Counselling & Support View
                </button>
                <button
                  onClick={() => { setActiveTab('Operations'); setActiveSubheading('Live Test Dialer'); setUserMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" /> Test Voice Call
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar with the 3 VED Nav Items and Subheadings */}
        <aside
          className={`fixed md:static inset-y-15 left-0 z-20 w-64 bg-white md:bg-[#f8fafc] border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto transform transition-transform duration-200 ease-in-out ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="py-4 px-3 space-y-2">
            <div className="px-2 pb-2 border-b border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                VED AI Voice Assistance
              </span>
            </div>

            {/* The 3 Main Nav Items */}
            {navItems.map((item) => {
              const isSectionActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    onClick={() => {
                      item.setIsOpen(!item.isOpen);
                      setActiveTab(item.id as any);
                      setActiveSubheading(item.subheadings[0]);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition-colors ${
                      isSectionActive
                        ? 'bg-blue-50/90 text-[#2563eb]'
                        : 'text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSectionActive ? 'text-[#2563eb]' : 'text-slate-500'}`} />
                      <span>{item.title}</span>
                    </div>
                    {item.isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {/* Subheadings */}
                  {item.isOpen && (
                    <div className="pl-7 pr-1 space-y-0.5 mt-0.5">
                      {item.subheadings.map((sub) => {
                        const isSubActive = isSectionActive && activeSubheading === sub;
                        return (
                          <button
                            key={sub}
                            onClick={() => {
                              setActiveTab(item.id as any);
                              setActiveSubheading(sub);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors block truncate ${
                              isSubActive
                                ? 'text-[#2563eb] font-semibold bg-blue-100/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Student College Portal Section (from Screenshot 2) */}
            <div className="pt-3 border-t border-slate-200/60">
              <button
                onClick={() => {
                  setStudentPortalOpen(!studentPortalOpen);
                  setActiveTab('StudentPortal');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition-colors ${
                  activeTab === 'StudentPortal' || activeTab === 'ProgramDetails'
                    ? 'bg-blue-50/90 text-[#2563eb]'
                    : 'text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  <span>Counselling & Support View</span>
                </div>
                {studentPortalOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {studentPortalOpen && (
                <div className="pl-7 pr-1 space-y-0.5 mt-0.5">
                  <button
                    onClick={() => { setActiveTab('StudentPortal'); setMobileSidebarOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors block truncate ${
                      activeTab === 'StudentPortal' ? 'text-[#2563eb] font-semibold bg-blue-100/60' : 'text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    Dashboard Overview
                  </button>
                  <button
                    onClick={() => { setActiveTab('ProgramDetails'); setMobileSidebarOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors block truncate ${
                      activeTab === 'ProgramDetails' ? 'text-[#2563eb] font-semibold bg-blue-100/60' : 'text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    B.Tech.(CSE) Program
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-10 md:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center text-xs text-slate-500 mb-6">
              <button
                onClick={() => { setActiveTab('Insights'); setActiveSubheading('Overview & KPIs'); }}
                className="text-[#1d4ed8] hover:underline font-medium"
              >
                Home
              </button>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-slate-600">
                {activeTab === 'StudentPortal' ? 'Admission Support Portal' : `VED ${activeTab}`}
              </span>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-slate-900 font-semibold">
                {activeTab === 'StudentPortal' ? 'Dashboard' : activeSubheading}
              </span>
            </div>

            {/* TAB 1: VED INSIGHTS */}
            {activeTab === 'Insights' && (
              <VedInsights
                subheading={activeSubheading}
                onQuickCall={() => { setActiveTab('Operations'); setActiveSubheading('Live Test Dialer'); }}
              />
            )}

            {/* TAB 2: VED OPERATIONS */}
            {activeTab === 'Operations' && (
              <VedOperations
                subheading={activeSubheading}
              />
            )}

            {/* TAB 3: VED DOCUMENTS */}
            {activeTab === 'Documents' && (
              <VedDocuments
                subheading={activeSubheading}
              />
            )}

            {/* STUDENT PORTAL OVERVIEW (Screenshot 2 faithful view) */}
            {activeTab === 'StudentPortal' && (
              <div className="space-y-6">
                {/* Announcement Card (Bright Blue banner with white vertical accent pipe) */}
                <div className="w-full bg-[#2563eb] text-white px-6 py-5 rounded-xs shadow-xs relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-white rounded-full"></div>
                    <h2 className="text-base font-bold text-white tracking-wide">
                      Announcement:
                    </h2>
                  </div>
                  <div className="pl-3">
                    <button
                      onClick={() => setShowAbcModal(true)}
                      className="text-white hover:underline text-xs sm:text-sm font-normal text-left inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>- Create/Link Your Academic Bank of Credits (ABC) Account</span>
                      {abcLinked && (
                        <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 text-[10px] px-2 py-0.5 rounded-full ml-2">
                          Linked
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Academic Program Card */}
                <div className="w-full max-w-md bg-white border border-slate-200 shadow-xs rounded-xs p-6">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase leading-snug tracking-tight mb-5">
                    B.TECH.(CSE) : BACHELOR OF TECHNOLOGY(COMPUTER SCIENCE AND ENGINEERING)
                  </h3>
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ProgramDetails')}
                      className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold py-1.5 px-4 rounded-xs shadow-xs transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      CLICK HERE
                    </button>
                  </div>
                </div>

                {/* Academic Snapshot Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="bg-white p-4 rounded-xs border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Current Semester</span>
                    <p className="text-lg font-bold text-slate-800 mt-1">{studentData.semester}</p>
                    <span className="text-[11px] text-blue-600 font-medium">Session 2025-2026</span>
                  </div>
                  <div className="bg-white p-4 rounded-xs border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Cumulative GPA</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{studentData.cgpa} / 10.0</p>
                    <span className="text-[11px] text-slate-500 font-medium">Rank: Top 5%</span>
                  </div>
                  <div className="bg-white p-4 rounded-xs border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Overall Attendance</span>
                    <p className="text-lg font-bold text-slate-800 mt-1">{studentData.attendance}</p>
                    <span className="text-[11px] text-emerald-600 font-medium">Eligible for Exams</span>
                  </div>
                  <div className="bg-white p-4 rounded-xs border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">VED Voice Support</span>
                    <p className="text-lg font-bold text-[#2563eb] mt-1">24x7 Active</p>
                    <span className="text-[11px] text-slate-500 font-medium">{primaryHelpline}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROGRAM DETAILS */}
            {activeTab === 'ProgramDetails' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 uppercase">
                      B.Tech. (Computer Science and Engineering)
                    </h2>
                    <p className="text-xs text-slate-500">Degree Curriculum, Semester Enrolments & Credits Breakdown</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('StudentPortal')}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    ← Back to Dashboard
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Course Code</th>
                        <th className="p-3">Course Title</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Credits</th>
                        <th className="p-3">Grade</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-mono font-medium text-blue-700">BCS-31</td>
                        <td className="p-3 font-medium">Database Management Systems</td>
                        <td className="p-3 text-slate-500">Core Theory + Lab</td>
                        <td className="p-3">4.0</td>
                        <td className="p-3 font-semibold text-emerald-600">A+</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">Passed</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-medium text-blue-700">BCS-32</td>
                        <td className="p-3 font-medium">Design & Analysis of Algorithms</td>
                        <td className="p-3 text-slate-500">Core Theory + Lab</td>
                        <td className="p-3">4.0</td>
                        <td className="p-3 font-semibold text-emerald-600">A</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">Passed</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-medium text-blue-700">BCS-33</td>
                        <td className="p-3 font-medium">Compiler Design</td>
                        <td className="p-3 text-slate-500">Core Theory</td>
                        <td className="p-3">3.0</td>
                        <td className="p-3 font-semibold text-blue-600">B+</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">Passed</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Bottom Left: © Samarth eGov */}
            <div className="mt-auto pt-10 pb-4">
              <p className="text-[13px] text-[#0284c7] font-medium tracking-wide">
                © Samarth eGov
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Academic Bank of Credits (ABC) Modal */}
      {showAbcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xs shadow-xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Academic Bank of Credits (ABC)</h3>
              <button
                onClick={() => setShowAbcModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-600 my-4 leading-relaxed">
              As per National Education Policy (NEP) guidelines, linking your APAAR / ABC ID ensures all earned academic credits from MMMUT are permanently credited to your DigiLocker repository.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  12-Digit ABC / APAAR ID
                </label>
                <input
                  type="text"
                  value={abcIdInput}
                  onChange={(e) => setAbcIdInput(e.target.value)}
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full px-3 py-2 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded text-[11px] text-blue-800">
                Don&apos;t have an ABC Account? You can generate one via DigiLocker using your Aadhaar details.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAbcModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbcLinked(true);
                  setShowAbcModal(false);
                }}
                className="px-4 py-1.5 text-xs bg-[#2563eb] text-white font-medium rounded hover:bg-blue-700"
              >
                Link Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
