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
  File,
  Copy,
  Check,
  Edit2,
  Save,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  Filter
} from 'lucide-react';

interface VedDocumentsProps {
  subheading?: string;
}

export interface QARecord {
  id: string;
  docId: string;
  docTitle: string;
  recordNumber: number | string;
  question: string;
  answer: string;
  raw?: string;
  extraFields?: { [key: string]: string };
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

  // Drill View: 'documents' or 'qa-records'
  const [viewMode, setViewMode] = useState<'documents' | 'qa-records'>('documents');
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('ALL');

  // Copy state & Edit state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<QARecord | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Helper: Parse documents (especially CSV / text records) into structured Q&A records
  const parseQARecordsFromDocs = (docsList: any[]): QARecord[] => {
    const records: QARecord[] = [];

    docsList.forEach((doc) => {
      const content = doc.content || '';
      const docId = doc.id || doc._id || 'doc';
      const docTitle = doc.title || 'Knowledge Doc';

      // 1. Look for structured CSV records formatted like:
      // "Record 91: No.: 91 | Admission Enquiry Question: ... | Answer: ..."
      // or "Record X: ... | Question: ... | Answer: ..."
      if (content.includes('Record ') || content.includes('Question:') || content.includes('Answer:')) {
        const lines = content.split('\n');
        lines.forEach((line: string, lineIdx: number) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          // Check if line contains question and answer tokens
          const qMatch = trimmed.match(/(?:Question|Admission Enquiry Question|Query)\s*:\s*(.*?)(?=\s*\|\s*(?:Answer|Response)|$)/i);
          const aMatch = trimmed.match(/(?:Answer|Response)\s*:\s*(.*)$/i);

          if (qMatch && aMatch) {
            const numMatch = trimmed.match(/Record\s*(\d+)/i) || trimmed.match(/No\.?\s*:\s*(\d+)/i);
            const recordNum = numMatch ? numMatch[1] : (lineIdx + 1);

            records.push({
              id: `${docId}-rec-${recordNum}-${lineIdx}`,
              docId,
              docTitle,
              recordNumber: recordNum,
              question: qMatch[1].trim(),
              answer: aMatch[1].trim(),
              raw: trimmed
            });
            return;
          }

          // Fallback: Check pipe separated parts
          if (trimmed.includes('|')) {
            const parts = trimmed.split('|').map((p: string) => p.trim());
            let foundQ = '';
            let foundA = '';
            let foundNo = `${lineIdx + 1}`;

            parts.forEach((part: string) => {
              if (/^(?:No|Record)\.?/i.test(part)) {
                foundNo = part.replace(/^(?:No|Record)\.?\s*:?/i, '').trim();
              } else if (/question/i.test(part)) {
                foundQ = part.replace(/^.*?question\s*:?/i, '').trim();
              } else if (/answer/i.test(part)) {
                foundA = part.replace(/^.*?answer\s*:?/i, '').trim();
              }
            });

            if (foundQ && foundA) {
              records.push({
                id: `${docId}-pipe-${foundNo}-${lineIdx}`,
                docId,
                docTitle,
                recordNumber: foundNo,
                question: foundQ,
                answer: foundA,
                raw: trimmed
              });
            }
          }
        });
      }

      // If document is a text FAQ or contains Q: / A: pairs
      if (records.filter(r => r.docId === docId).length === 0) {
        // Fallback parser for standard Q&A
        const qaMatches = content.split(/\n(?=(?:Q|Question)\s*\d*[:.-])/i);
        if (qaMatches.length > 1) {
          qaMatches.forEach((chunk: string, cIdx: number) => {
            const qPartMatch = chunk.match(/(?:Q|Question)\s*\d*[:.-]\s*([\s\S]*?)(?=(?:A|Answer)[:.-]|$)/i);
            const aPartMatch = chunk.match(/(?:A|Answer)[:.-]\s*([\s\S]*)$/i);
            if (qPartMatch && aPartMatch) {
              records.push({
                id: `${docId}-qa-${cIdx}`,
                docId,
                docTitle,
                recordNumber: cIdx + 1,
                question: qPartMatch[1].trim(),
                answer: aPartMatch[1].trim(),
                raw: chunk
              });
            }
          });
        }
      }
    });

    return records;
  };

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
          id: 'doc-csv-1',
          _id: 'doc-csv-1',
          title: 'MMMUT_Admission_Enquiry_Knowledge_Base.csv',
          type: 'CSV',
          size: '350 KB',
          updatedAt: '2026-03-12',
          chunks: 12,
          content: `Record 91: No.: 91 | Admission Enquiry Question: What is the academic session for the admission? | Answer: The academic session is specified in the current admission notification and academic calendar.
Record 92: No.: 92 | Admission Enquiry Question: When will classes begin? | Answer: Classes generally begin according to the academic calendar published by the university.
Record 93: No.: 93 | Admission Enquiry Question: How will I receive admission-related updates? | Answer: Updates are communicated through the official website, admission portal, registered email, SMS, or official notices.
Record 94: No.: 94 | Admission Enquiry Question: Whom should I contact for admission-related problems? | Answer: Contact the university admission help desk or the concerned department using the official contact details published on the admission portal.
Record 95: No.: 95 | Admission Enquiry Question: What should I do if I enter incorrect information in the application? | Answer: If the correction window is open, correct the information within the prescribed timeline.`
        },
        {
          id: 'doc-1',
          _id: 'doc-1',
          title: 'MMMUT_Admissions_Ordinance_2026.pdf',
          type: 'PDF',
          size: '1.4 MB',
          updatedAt: '2026-03-10',
          chunks: 42,
          content: 'Madan Mohan Malaviya University of Technology Admission Ordinance 2026. Eligibility criteria: CUET-UG & JEE Main ranks. Reservation policies as per UP State Government. Lateral entry into 2nd year B.Tech for diploma holders.'
        },
        {
          id: 'doc-2',
          _id: 'doc-2',
          title: 'Samarth_Student_Portal_User_Manual.pdf',
          type: 'PDF',
          size: '890 KB',
          updatedAt: '2026-02-14',
          chunks: 28,
          content: 'Guidelines for course registration, fee receipt download, APAAR / Academic Bank of Credits (ABC) linking, and examination admit card generation on Samarth eGov.'
        },
        {
          id: 'doc-3',
          _id: 'doc-3',
          title: 'Academic_Fee_Structure_and_Hostel_Charges.pdf',
          type: 'PDF',
          size: '640 KB',
          updatedAt: '2026-01-20',
          chunks: 18,
          content: 'Tuition fee for B.Tech CSE: ₹68,200 per semester. Hostel room rent: ₹12,000/year. Mess advance: ₹18,000/semester. Fee waiver schemes for economically disadvantaged candidates.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const allQARecords = parseQARecordsFromDocs(sources);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadMode === 'file' && selectedFile) {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', newTitle.trim() || selectedFile.name);
      formData.append('entity', 'VED');

      try {
        const res = await fetch(`${BACKEND_URL}/knowledge/upload`, {
          method: 'POST',
          body: formData
        });
        const resData = await res.json();
        if (resData.document) {
          setSources(prev => [resData.document, ...prev]);
        } else {
          fetchSources();
        }
      } catch {
        // Fallback local update
        const ext = selectedFile.name.endsWith('.csv') ? 'CSV' : selectedFile.name.endsWith('.pdf') ? 'PDF' : 'FILE';
        const fallbackDoc = {
          id: `doc-${Date.now()}`,
          _id: `doc-${Date.now()}`,
          title: newTitle.trim() || selectedFile.name,
          type: ext,
          size: `${Math.round(selectedFile.size / 1024)} KB`,
          updatedAt: new Date().toISOString().split('T')[0],
          chunks: 10,
          content: newContent.trim() || `Processed file ${selectedFile.name}`
        };
        setSources(prev => [fallbackDoc, ...prev]);
      } finally {
        setIsSubmitting(false);
        setIsModalOpen(false);
        setNewTitle('');
        setNewContent('');
        setSelectedFile(null);
      }
      return;
    }

    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const newDoc = {
      _id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      type: 'TEXT',
      size: '240 KB',
      updatedAt: new Date().toISOString().split('T')[0],
      chunks: 8,
      content: newContent.trim() || 'Uploaded document content parsed and indexed into vector embeddings for VED AI Assistant.'
    };

    try {
      await fetch(`${BACKEND_URL}/knowledge/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDoc.title,
          content: newDoc.content,
          entity: 'VED'
        })
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
    setSources(prev => prev.filter(s => (s.id || s._id) !== id));
  };

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleOpenEditModal = (rec: QARecord) => {
    setEditingRecord(rec);
    setEditQuestion(rec.question);
    setEditAnswer(rec.answer);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);

    const targetDoc = sources.find(s => (s.id || s._id) === editingRecord.docId);
    if (!targetDoc) {
      setSavingEdit(false);
      return;
    }

    // Reconstruct the updated content for this document
    let updatedContent = targetDoc.content || '';
    if (editingRecord.raw && updatedContent.includes(editingRecord.raw)) {
      // Replace the exact raw line
      const newRaw = editingRecord.raw
        .replace(editingRecord.question, editQuestion)
        .replace(editingRecord.answer, editAnswer);
      updatedContent = updatedContent.replace(editingRecord.raw, newRaw);
    } else {
      // Generic replacement
      updatedContent = updatedContent
        .replace(editingRecord.question, editQuestion)
        .replace(editingRecord.answer, editAnswer);
    }

    const docRealId = targetDoc.id || targetDoc._id;

    // Send PUT update to backend
    try {
      await fetch(`${BACKEND_URL}/knowledge/${docRealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetDoc.title,
          content: updatedContent
        })
      });
    } catch {
      // ignore
    }

    // Update local state
    setSources(prev => prev.map(s => {
      if ((s.id || s._id) === docRealId) {
        return { ...s, content: updatedContent };
      }
      return s;
    }));

    setSavingEdit(false);
    setEditingRecord(null);
    setSaveSuccessMsg(`Record #${editingRecord.recordNumber} updated successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Filter sources for Documents Table
  const filteredSources = sources.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.content && s.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter records for Q&A Records Table
  const filteredQARecords = allQARecords.filter(rec => {
    const matchesDoc = selectedDocFilter === 'ALL' || rec.docId === selectedDocFilter;
    const matchesQuery = 
      searchQuery.trim() === '' ||
      rec.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.docTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(rec.recordNumber).includes(searchQuery);
    return matchesDoc && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-display">Data Room</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
              Knowledge Base
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Uploaded files and parsed question-answer records used by VED to answer student helpline inquiries.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Drill-down Sub-navigation: Documents vs Q&A Records */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('documents')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'documents'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${viewMode === 'documents' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('qa-records')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'qa-records'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Q&A Records (CSV)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${viewMode === 'qa-records' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {allQARecords.length}
            </span>
          </button>
        </div>

        {/* Search Bar & Document Selector */}
        <div className="flex items-center gap-3">
          {viewMode === 'qa-records' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDocFilter}
                onChange={e => setSelectedDocFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="ALL">All Documents ({allQARecords.length} records)</option>
                {sources.map(doc => {
                  const count = allQARecords.filter(r => r.docId === (doc.id || doc._id)).length;
                  return (
                    <option key={doc.id || doc._id} value={doc.id || doc._id}>
                      {doc.title} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={viewMode === 'documents' ? "Search documents or topics..." : "Search questions, answers, records..."}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 outline-none shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: DOCUMENTS TABLE                                                  */}
      {/* ========================================================================= */}
      {viewMode === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Document Title</th>
                  <th className="p-3.5">Format</th>
                  <th className="p-3.5">File Size</th>
                  <th className="p-3.5">Status / Chunks</th>
                  <th className="p-3.5">Parsed Records</th>
                  <th className="p-3.5">Updated</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSources.map(doc => {
                  const docQACount = allQARecords.filter(r => r.docId === (doc.id || doc._id)).length;
                  return (
                    <tr key={doc.id || doc._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {doc.type === 'CSV' || doc.title.toLowerCase().endsWith('.csv') ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-800">{doc.title}</span>
                        </div>
                      </td>
                      <td className="p-3.5 uppercase text-slate-500 font-mono text-[11px]">{doc.type || 'PDF'}</td>
                      <td className="p-3.5 text-slate-500">{doc.size || '350 KB'}</td>
                      <td className="p-3.5">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200/50">
                          {doc.chunks || 12} Chunks
                        </span>
                      </td>
                      <td className="p-3.5">
                        {docQACount > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedDocFilter(doc.id || doc._id);
                              setViewMode('qa-records');
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60"
                          >
                            <span>{docQACount} Q&A Records</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unstructured</span>
                        )}
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
                            onClick={() => handleDeleteSource(doc.id || doc._id)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: QUESTION & ANSWER RECORDS (CSV / DATA ROOM DRILL MENU)            */}
      {/* ========================================================================= */}
      {viewMode === 'qa-records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <b className="text-slate-800">{filteredQARecords.length}</b> question & answer records
              {selectedDocFilter !== 'ALL' && ` from selected document`}
            </span>
            <span className="text-slate-400">
              Double-check or update answers to fine-tune AI voice caller responses
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-16 text-center">Record #</th>
                    <th className="p-3.5 w-1/3">Question</th>
                    <th className="p-3.5">Verified Answer</th>
                    <th className="p-3.5 w-44">Source Document</th>
                    <th className="p-3.5 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQARecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No question-answer records found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredQARecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Record No */}
                        <td className="p-3.5 text-center font-mono font-bold text-slate-400 group-hover:text-blue-600">
                          #{rec.recordNumber}
                        </td>

                        {/* Question */}
                        <td className="p-3.5 align-top">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {rec.question}
                          </div>
                        </td>

                        {/* Answer */}
                        <td className="p-3.5 align-top">
                          <div className="text-slate-700 leading-relaxed bg-slate-50/80 p-2.5 rounded border border-slate-200/60 font-sans text-[11px]">
                            {rec.answer}
                          </div>
                        </td>

                        {/* Document Name */}
                        <td className="p-3.5 align-top">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate max-w-44" title={rec.docTitle}>
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{rec.docTitle}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Copy Answer Button */}
                            <button
                              onClick={() => handleCopyAnswer(rec.id, rec.answer)}
                              className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Copy Answer"
                            >
                              {copiedId === rec.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Question / Answer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT QUESTION & ANSWER RECORD                                    */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Record #{editingRecord.recordNumber}
                </span>
                <h3 className="text-base font-bold text-slate-800">Edit Knowledge Record</h3>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source Document</label>
                <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                  {editingRecord.docTitle}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question</label>
                <textarea
                  rows={2}
                  value={editQuestion}
                  onChange={e => setEditQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Answer (Used by AI Voice Assistant)</label>
                <textarea
                  rows={4}
                  value={editAnswer}
                  onChange={e => setEditAnswer(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {savingEdit ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD DOCUMENT                                                 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Add University Document to VED</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex border-b border-slate-200 my-3">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  uploadMode === 'file' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Upload File (CSV, PDF, TXT)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  uploadMode === 'text' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Paste Text / FAQ
              </button>
            </div>

            <form onSubmit={handleAddSource} className="space-y-4 my-2">
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Choose File</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.pdf,.txt,.json,.md"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        if (!newTitle) setNewTitle(e.target.files[0].name);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Upload CSV to automatically index structured Question & Answer rows into records.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. MMMUT_Admission_Enquiry_Knowledge_Base.csv"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                />
              </div>

              {uploadMode === 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Text / Summary</label>
                  <textarea
                    rows={4}
                    placeholder="Paste rules, Q&A pairs (e.g. Record 1: Question: ... | Answer: ...), or guidelines..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
              )}

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
                  className="px-4 py-1.5 bg-[#2563eb] text-white text-xs font-semibold rounded hover:bg-blue-700 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Indexing...' : 'Index Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DOCUMENT INSPECTOR (WITH FORMATTED RECORDS BELOW SUMMARY)         */}
      {/* ========================================================================= */}
      {inspectorSource && (() => {
        const docRecords = allQARecords.filter(r => r.docId === (inspectorSource.id || inspectorSource._id));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <h3 className="text-base font-bold text-slate-800 truncate">{inspectorSource.title}</h3>
                <button onClick={() => setInspectorSource(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              <div className="my-4 text-xs space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="flex gap-4 text-slate-500 shrink-0">
                  <span>Format: <b>{inspectorSource.type || 'PDF'}</b></span>
                  <span>Size: <b>{inspectorSource.size || '350 KB'}</b></span>
                  <span>Chunks: <b>{inspectorSource.chunks || 12}</b></span>
                  <span>Records: <b className="text-blue-600">{docRecords.length}</b></span>
                </div>

                {/* Formatted Question & Answer Records Breakdown */}
                {docRecords.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Parsed Records ({docRecords.length})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDocFilter(inspectorSource.id || inspectorSource._id);
                          setViewMode('qa-records');
                          setInspectorSource(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Open in Records Table <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {docRecords.map(rec => (
                        <div key={rec.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              Record #{rec.recordNumber}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopyAnswer(rec.id, rec.answer)}
                                className="text-slate-400 hover:text-blue-600 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                              >
                                {copiedId === rec.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                {copiedId === rec.id ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                onClick={() => {
                                  setInspectorSource(null);
                                  handleOpenEditModal(rec);
                                }}
                                className="text-slate-400 hover:text-slate-800 text-[10px] font-semibold cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-slate-800">
                            Q: {rec.question}
                          </div>
                          <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                            A: {rec.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Content / Summary */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Raw Document Content
                  </span>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-200 max-h-44 overflow-y-auto leading-relaxed select-text">
                    {inspectorSource.content || 'Content indexed and available for live query grounding in VED AI Assistant.'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectorSource(null)}
                  className="px-4 py-1.5 text-xs bg-slate-100 text-slate-700 font-semibold rounded hover:bg-slate-200 cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
