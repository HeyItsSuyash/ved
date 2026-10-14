'use client';

import React, { useState } from 'react';
import {
  User,
  Users,
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
  Building
} from 'lucide-react';

interface StudentDashboardProps {
  studentRoll: string;
  onLogout: () => void;
}

export default function StudentDashboard({
  studentRoll = '2023CSD0622',
  onLogout
}: StudentDashboardProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [studentMenuOpen, setStudentMenuOpen] = useState(true);
  const [examMenuOpen, setExamMenuOpen] = useState(false);
  const [placementMenuOpen, setPlacementMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Modal states
  const [showAbcModal, setShowAbcModal] = useState(false);
  const [abcLinked, setAbcLinked] = useState(false);
  const [abcIdInput, setAbcIdInput] = useState('APAAR-9823-4120-7761');

  // Student details
  const studentData = {
    name: 'Suyash Rai',
    rollNumber: studentRoll,
    enrollmentNo: 'MMMUT/2023/CS/0622',
    department: 'Computer Science and Engineering',
    program: 'B.TECH.(CSE) : BACHELOR OF TECHNOLOGY(COMPUTER SCIENCE AND ENGINEERING)',
    semester: '6th Semester',
    batch: '2023 - 2027',
    admissionCategory: 'General (Open)',
    email: 'suyash.2023csd0622@mmmut.ac.in',
    mobile: '+91 98765 43210',
    bloodGroup: 'B+',
    fatherName: 'R. K. Rai',
    cgpa: '8.46',
    attendance: '89.2%'
  };

  const studentMenuItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Profile', label: 'Profile' },
    { id: 'ProgramDetails', label: 'B.Tech.(CSE) : Bachelor of T...' },
    { id: 'Fee', label: 'Fee' },
    { id: 'CourseSelection', label: 'Course(s) Selection' },
    { id: 'UploadSection', label: 'Upload Section' },
    { id: 'Services', label: 'Services' },
    { id: 'Dues', label: 'Dues' },
    { id: 'Certificates', label: 'Certificates' },
    { id: 'ProfileUpdatedDetails', label: 'Profile Updated Details' },
    { id: 'MyPayment', label: 'My Payment' },
    { id: 'SwayamCourses', label: 'Swayam Courses' },
    { id: 'OuTransferHistory', label: 'Ou Transfer History' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#edf0f5] text-slate-800 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* SU Brand Logo as shown in Screenshot 2 */}
          <div
            onClick={() => setActiveTab('Dashboard')}
            className="cursor-pointer select-none"
          >
            <span className="text-[#1d4ed8] text-xl font-bold tracking-tight">
              SU
            </span>
          </div>
        </div>

        {/* Right Student Profile Indicator */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 py-1 px-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {/* Avatar matching screenshot: dark circular icon with user bust */}
            <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-white shadow-xs">
              <User className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-700">
              {studentRoll}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{studentData.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{studentData.email}</p>
                <span className="inline-block mt-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                  {studentData.rollNumber}
                </span>
              </div>
              <button
                onClick={() => { setActiveTab('Profile'); setUserMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-slate-400" /> My Profile
              </button>
              <button
                onClick={() => { setActiveTab('Fee'); setUserMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Fee Receipts
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
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed md:static inset-y-14 left-0 z-20 w-64 bg-white md:bg-[#f8fafc] border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto transform transition-transform duration-200 ease-in-out ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="py-3 px-2 space-y-1">
            {/* 1. Student Accordion */}
            <div>
              <button
                onClick={() => setStudentMenuOpen(!studentMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100/70 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 fill-blue-600/20" />
                  <span>Student</span>
                </div>
                {studentMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Sub items under Student */}
              {studentMenuOpen && (
                <div className="mt-1 space-y-0.5 pl-6 pr-1">
                  {studentMenuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors block truncate ${
                          isActive
                            ? 'text-[#2563eb] font-semibold bg-blue-50/80'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 font-normal'
                        }`}
                        title={item.label}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Examination Accordion */}
            <div className="pt-1">
              <button
                onClick={() => setExamMenuOpen(!examMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/70 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Examination</span>
                </div>
                {examMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              {examMenuOpen && (
                <div className="mt-1 space-y-0.5 pl-6 pr-1">
                  {['Admit Card', 'Grades & Results', 'Exam Schedule', 'Re-evaluation'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => { setActiveTab(`Exam_${sub}`); setMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded block truncate ${
                        activeTab === `Exam_${sub}`
                          ? 'text-[#2563eb] font-semibold bg-blue-50'
                          : 'text-slate-600 hover:bg-slate-100/50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Training & Placement Accordion */}
            <div className="pt-1">
              <button
                onClick={() => setPlacementMenuOpen(!placementMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/70 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Training & Placement</span>
                </div>
                {placementMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              {placementMenuOpen && (
                <div className="mt-1 space-y-0.5 pl-6 pr-1">
                  {['T&P Registration', 'Placement Drives', 'Internship Portal', 'Resume Builder'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => { setActiveTab(`Placement_${sub}`); setMobileSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded block truncate ${
                        activeTab === `Placement_${sub}`
                          ? 'text-[#2563eb] font-semibold bg-blue-50'
                          : 'text-slate-600 hover:bg-slate-100/50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-10 md:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
            
            {/* Breadcrumb Navigation as seen in screenshot */}
            <div className="flex items-center text-xs text-slate-500 mb-6">
              <button
                onClick={() => setActiveTab('Dashboard')}
                className="text-[#1d4ed8] hover:underline font-medium"
              >
                Home
              </button>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-slate-700 font-medium">
                {activeTab === 'Dashboard' ? 'Dashboard' : activeTab.replace('Exam_', 'Examination / ').replace('Placement_', 'Training & Placement / ')}
              </span>
            </div>

            {/* TAB: DASHBOARD (Matches Screenshot 2 Exactly) */}
            {activeTab === 'Dashboard' && (
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

                {/* Academic Program Card (Matches Screenshot 2 Exactly) */}
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
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Fee Clearance</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">₹0.00 Due</p>
                    <span className="text-[11px] text-slate-500 font-medium">No Pending Dues</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'Profile' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Student Personal Profile</h2>
                    <p className="text-xs text-slate-500">Official student records registered under MMMUT Samarth portal</p>
                  </div>
                  <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold">
                    Verified Active Student
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Full Name</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Roll Number</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Enrollment Number</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.enrollmentNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Program / Degree</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.program}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Father / Guardian Name</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.fatherName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Admission Batch</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.batch}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Official University Email</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Contact Number</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Academic Bank of Credits (ABC / APAAR ID)</span>
                    <span className="font-semibold text-blue-600 text-sm">
                      {abcLinked ? abcIdInput : 'Not Linked (Click on Dashboard to Link)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Blood Group</span>
                    <span className="font-semibold text-slate-800 text-sm">{studentData.bloodGroup}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROGRAM DETAILS (B.Tech CSE) */}
            {activeTab === 'ProgramDetails' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-slate-900 uppercase">
                    B.Tech. (Computer Science and Engineering)
                  </h2>
                  <p className="text-xs text-slate-500">Degree Curriculum, Semester Enrolments & Credits Breakdown</p>
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
                      <tr>
                        <td className="p-3 font-mono font-medium text-blue-700">BCS-34</td>
                        <td className="p-3 font-medium">Artificial Intelligence & Machine Learning</td>
                        <td className="p-3 text-slate-500">Elective</td>
                        <td className="p-3">4.0</td>
                        <td className="p-3 font-semibold text-emerald-600">O (Outstanding)</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">Passed</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-medium text-blue-700">BCS-35</td>
                        <td className="p-3 font-medium">Computer Networks</td>
                        <td className="p-3 text-slate-500">Core Theory + Lab</td>
                        <td className="p-3">4.0</td>
                        <td className="p-3 font-semibold text-emerald-600">A</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">Passed</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: FEE */}
            {activeTab === 'Fee' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Fee Payment History & Invoices</h2>
                    <p className="text-xs text-slate-500">Tuition, Hostel, Examination and Academic Fees</p>
                  </div>
                  <button className="bg-[#2563eb] text-white text-xs font-medium py-1.5 px-3 rounded hover:bg-blue-700">
                    Pay Online Fee
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Receipt No.</th>
                        <th className="p-3">Semester</th>
                        <th className="p-3">Transaction Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-mono">MMMUT/FEE/2025/0841</td>
                        <td className="p-3">Semester 6</td>
                        <td className="p-3 text-slate-500">12 Jan 2026</td>
                        <td className="p-3 font-semibold">₹68,200.00</td>
                        <td className="p-3">SBI Net Banking</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium">Paid</span></td>
                        <td className="p-3">
                          <button className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">MMMUT/FEE/2024/4912</td>
                        <td className="p-3">Semester 5</td>
                        <td className="p-3 text-slate-500">18 Jul 2025</td>
                        <td className="p-3 font-semibold">₹68,200.00</td>
                        <td className="p-3">HDFC Gateway</td>
                        <td className="p-3"><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium">Paid</span></td>
                        <td className="p-3">
                          <button className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: COURSE SELECTION */}
            {activeTab === 'CourseSelection' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Course(s) Selection & Electives</h2>
                <p className="text-xs text-slate-500">Choose Open Electives & Departmental Electives for the upcoming term.</p>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  Course Selection window for Semester 7 will commence on <b>15th May 2026</b>.
                </div>
              </div>
            )}

            {/* TAB: UPLOAD SECTION */}
            {activeTab === 'UploadSection' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Upload Section</h2>
                  <p className="text-xs text-slate-500">Manage uploaded identity documents, signatures, and certificates</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="border border-slate-200 p-4 rounded text-center">
                    <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="font-semibold block text-slate-800">Passport Photo</span>
                    <span className="text-emerald-600 text-[11px] block mt-1">Verified</span>
                  </div>
                  <div className="border border-slate-200 p-4 rounded text-center">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="font-semibold block text-slate-800">Student Signature</span>
                    <span className="text-emerald-600 text-[11px] block mt-1">Verified</span>
                  </div>
                  <div className="border border-dashed border-blue-400 bg-blue-50/50 p-4 rounded text-center cursor-pointer hover:bg-blue-50">
                    <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <span className="font-semibold block text-blue-700">Upload New Doc</span>
                    <span className="text-slate-500 text-[11px] block mt-1">PDF, JPG up to 2MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SERVICES */}
            {activeTab === 'Services' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Student e-Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="border border-slate-200 p-4 rounded hover:shadow-xs cursor-pointer">
                    <h3 className="font-bold text-slate-800 mb-1">Hostel Allocation</h3>
                    <p className="text-slate-500">Apply or renew hostel rooms and mess cards.</p>
                  </div>
                  <div className="border border-slate-200 p-4 rounded hover:shadow-xs cursor-pointer">
                    <h3 className="font-bold text-slate-800 mb-1">Bonafide Certificate</h3>
                    <p className="text-slate-500">Generate instant digital bonafide certificate.</p>
                  </div>
                  <div className="border border-slate-200 p-4 rounded hover:shadow-xs cursor-pointer">
                    <h3 className="font-bold text-slate-800 mb-1">Railway Concession</h3>
                    <p className="text-slate-500">Request railway travel concession vouchers.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DUES */}
            {activeTab === 'Dues' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">No Dues Status</h2>
                <p className="text-xs text-slate-500">Clearance status across departments and university facilities</p>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-semibold">All clearances approved!</p>
                    <p className="text-emerald-700">Library: Nil | Hostel: Nil | Lab & Workshop: Nil | Sports: Nil</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CERTIFICATES */}
            {activeTab === 'Certificates' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Digital Certificates</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">Provisional Degree Certificate</p>
                      <p className="text-slate-500">Available after 8th semester graduation</p>
                    </div>
                    <span className="text-slate-400">Pending</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">Semester Grade Card (Sem 5)</p>
                      <p className="text-slate-500">Issued on 24 Dec 2025</p>
                    </div>
                    <button className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE UPDATED DETAILS */}
            {activeTab === 'ProfileUpdatedDetails' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Profile Updated Details Log</h2>
                <p className="text-xs text-slate-500">Audit trail of student profile changes verified by academic section</p>
                <div className="text-xs border border-slate-200 rounded divide-y divide-slate-100">
                  <div className="p-3">
                    <span className="font-semibold text-slate-800">Mobile Number Updated</span>
                    <span className="text-slate-400 block text-[11px]">Updated on 04 Jan 2026 via OTP verification</span>
                  </div>
                  <div className="p-3">
                    <span className="font-semibold text-slate-800">Residential Address Confirmed</span>
                    <span className="text-slate-400 block text-[11px]">Verified on 18 Sep 2025</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY PAYMENT */}
            {activeTab === 'MyPayment' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">My Payment Transactions</h2>
                <p className="text-xs text-slate-500">All electronic transactions recorded in Samarth eGov Gateway</p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                  Total Fees Paid in current academic year: <b>₹1,36,400.00</b> (All reconciled).
                </div>
              </div>
            )}

            {/* TAB: SWAYAM COURSES */}
            {activeTab === 'SwayamCourses' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Swayam / NPTEL MOOCs Integration</h2>
                <p className="text-xs text-slate-500">Credit transfer eligible online courses</p>
                <div className="p-4 border border-slate-200 rounded text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Cloud Computing (12 Weeks NPTEL)</span>
                    <span className="text-emerald-600 font-semibold">4 Credits Transferred</span>
                  </div>
                  <p className="text-slate-500">IIT Kharagpur | Score: 87% (Elite + Silver Certificate)</p>
                </div>
              </div>
            )}

            {/* TAB: OU TRANSFER HISTORY */}
            {activeTab === 'OuTransferHistory' && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Organizational Unit (OU) Transfer History</h2>
                <p className="text-xs text-slate-500">Department or Campus Branch migration records</p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                  No inter-departmental transfers requested. Enrolled in <b>Department of Computer Science & Engineering</b> since inception.
                </div>
              </div>
            )}

            {/* EXAMINATION TAB */}
            {activeTab.startsWith('Exam_') && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">
                  Examination: {activeTab.replace('Exam_', '')}
                </h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                  <p className="font-semibold mb-1">End Semester Examination Session 2025-26</p>
                  <p>Admit card and examination venue schedules will be released 7 days before commencement.</p>
                </div>
              </div>
            )}

            {/* TRAINING & PLACEMENT TAB */}
            {activeTab.startsWith('Placement_') && (
              <div className="bg-white border border-slate-200 rounded-xs shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-800">
                  Training & Placement: {activeTab.replace('Placement_', '')}
                </h2>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
                  <p className="font-semibold mb-1">MMMUT Placement Cell Active Drives</p>
                  <p>18 upcoming campus placement drives registered. Maintain an active profile and updated resume.</p>
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
              As per National Education Policy (NEP) guidelines, linking your APAAR / ABC ID ensures all earned academic credits from MMMUT and SWAYAM are permanently credited to your DigiLocker repository.
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
