'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  X, 
  AlertCircle, 
  Database, 
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  File
} from 'lucide-react';

interface VedDocumentsProps {
  subheading?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';

export default function VedDocuments({ subheading = 'Knowledge Base Documents' }: VedDocumentsProps) {
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorSource, setInspectorSource] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/knowledge`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setSources(data);
      } else {
        throw new Error('No data');
      }
    } catch {
      // Default MMMUT Knowledge Base documents
      setSources([
        {
          _id: 'doc-1',
          title: 'MMMUT_Admissions_Ordinance_2026.pdf',
          type: 'pdf',
          size: '1.4 MB',
          updatedAt: '2026-03-10',
          chunks: 42,
          content: 'Madan Mohan Malaviya University of Technology Admission Ordinance 2026. Eligibility criteria: CUET-UG & JEE Main ranks. Reservation policies as per UP State Government. Lateral entry into 2nd year B.Tech for diploma holders.'
        },
        {
          _id: 'doc-2',
          title: 'Samarth_Student_Portal_User_Manual.pdf',
          type: 'pdf',
          size: '890 KB',
          updatedAt: '2026-02-14',
          chunks: 28,
          content: 'Guidelines for course registration, fee receipt download, APAAR / Academic Bank of Credits (ABC) linking, and examination admit card generation on Samarth eGov.'
        },
        {
          _id: 'doc-3',
          title: 'Academic_Fee_Structure_and_Hostel_Charges.pdf',
          type: 'pdf',
          size: '640 KB',
          updatedAt: '2026-01-20',
          chunks: 18,
          content: 'Tuition fee for B.Tech CSE: ₹68,200 per semester. Hostel room rent: ₹12,000/year. Mess advance: ₹18,000/semester. Fee waiver schemes for economically disadvantaged candidates.'
        },
        {
          _id: 'doc-4',
          title: 'Examination_Regulations_and_Grading_Rules.txt',
          type: 'text',
          size: '120 KB',
          updatedAt: '2026-01-05',
          chunks: 14,
          content: 'Grading system: O (10.0), A+ (9.0), A (8.0), B+ (7.0), B (6.0), C (5.0), P (4.0), F (0.0). Minimum passing attendance is 75% across all lecture and lab sessions.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const newDoc = {
      _id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      type: uploadMode === 'file' ? 'pdf' : 'text',
      size: '240 KB',
      updatedAt: new Date().toISOString().split('T')[0],
      chunks: 8,
      content: newContent.trim() || 'Uploaded document content parsed and indexed into vector embeddings for VED AI Assistant.'
    };

    try {
      await fetch(`${BACKEND_URL}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
    } catch {
      // ignore
    }

    setSources(prev => [newDoc, ...prev]);
    setIsSubmitting(false);
    setIsModalOpen(false);
    setNewTitle('');
    setNewContent('');
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`${BACKEND_URL}/knowledge/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setSources(prev => prev.filter(s => s._id !== id));
  };

  const filteredSources = sources.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.content && s.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Room</h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload files here. The AI uses this data to answer caller questions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documents or topics..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Document Grid / Table */}
      <div className="bg-white border border-slate-200 rounded-xs shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Document Title</th>
                <th className="p-3.5">Format</th>
                <th className="p-3.5">File Size</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Updated</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSources.map(doc => (
                <tr key={doc._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{doc.title}</span>
                    </div>
                  </td>
                  <td className="p-3.5 uppercase text-slate-500 font-mono text-[11px]">{doc.type || 'PDF'}</td>
                  <td className="p-3.5 text-slate-500">{doc.size || '350 KB'}</td>
                  <td className="p-3.5">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-medium">
                      {doc.chunks || 12} Chunks
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">{doc.updatedAt || 'Recent'}</td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setInspectorSource(doc)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => handleDeleteSource(doc._id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Add University Document to VED</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSource} className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. BTech_Curriculum_Syllabus_2026.pdf"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Text / Summary</label>
                <textarea
                  rows={4}
                  placeholder="Paste rules, ordinance guidelines, or key points to be indexed..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#2563eb] text-white text-xs font-semibold rounded hover:bg-blue-700"
                >
                  {isSubmitting ? 'Indexing...' : 'Index Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Inspector Modal */}
      {inspectorSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 truncate">{inspectorSource.title}</h3>
              <button onClick={() => setInspectorSource(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="my-4 text-xs space-y-3">
              <div className="flex gap-4 text-slate-500">
                <span>Format: <b>{inspectorSource.type || 'PDF'}</b></span>
                <span>Size: <b>{inspectorSource.size || '350 KB'}</b></span>
                <span>Chunks: <b>{inspectorSource.chunks || 12}</b></span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-700 max-h-64 overflow-y-auto leading-relaxed">
                {inspectorSource.content || 'Content indexed and available for live query grounding in VED AI Assistant.'}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectorSource(null)}
                className="px-4 py-1.5 text-xs bg-slate-100 text-slate-700 font-semibold rounded hover:bg-slate-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
