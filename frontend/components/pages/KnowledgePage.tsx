'use client';

import React, { useMemo, useRef, useState } from 'react';
import { FileText, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatDateTime } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  Loading,
  Notice,
  PageHeader,
  Textarea,
  cx,
} from '@/components/ui';

type Doc = {
  id: string;
  title: string | null;
  content: string | null;
  type: string | null;
  created_at: string;
};

const ACCEPT = '.pdf,.csv,.txt,.md,.json';

/** Uploaded CSVs are stored as "Record N: col: value | col: value" lines. */
function parseCsvRecords(content: string): { columns: string[]; rows: string[][] } | null {
  const lines = content.split('\n').filter((l) => /^Record \d+: /.test(l));
  if (lines.length === 0) return null;
  const columns: string[] = [];
  const parsed = lines.map((line) => {
    const cells: Record<string, string> = {};
    line
      .replace(/^Record \d+: /, '')
      .split(' | ')
      .forEach((pair) => {
        const idx = pair.indexOf(': ');
        const key = idx === -1 ? pair : pair.slice(0, idx);
        const value = idx === -1 ? '' : pair.slice(idx + 2);
        if (!columns.includes(key)) columns.push(key);
        cells[key] = value;
      });
    return cells;
  });
  return { columns, rows: parsed.map((r) => columns.map((c) => r[c] ?? '')) };
}

function sizeLabel(content: string | null) {
  const n = content?.length || 0;
  if (n < 1000) return `${n} chars`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k chars`;
}

export default function KnowledgePage() {
  const { data, setData, error, loading, reload } = useApi<Doc[]>('/knowledge');
  const docs = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.title?.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q));
  }, [docs, query]);

  const selected = docs.find((d) => d.id === selectedId) || null;

  const upload = async (file: File) => {
    setUploading(true);
    setActionError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name);
    try {
      const res = await api<{ document: Doc }>('/knowledge/upload', { method: 'POST', body: form });
      setData([res.document, ...docs]);
      setSelectedId(res.document.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="Knowledge base"
        description="The agent answers only from these documents. If something is not here, it tells the caller it does not have that information."
        actions={
          <>
            <Button icon={Plus} onClick={() => { setAdding(true); setSelectedId(null); }}>
              Add text
            </Button>
            <Button variant="primary" icon={Upload} loading={uploading} onClick={() => fileInput.current?.click()}>
              Upload file
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </>
        }
      />

      {(error || actionError) && (
        <div className="mb-4">
          <Notice onRetry={error ? reload : undefined}>{error || actionError}</Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card bodyClassName="p-0">
          <div className="px-4 py-3 border-b border-zinc-200">
            <div className="relative">
              <Search className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents"
                className="pl-9"
                aria-label="Search documents"
              />
            </div>
          </div>
          {loading && !data ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={query ? 'No documents match' : 'No documents yet'}
              description={query ? undefined : 'Upload PDF, CSV, TXT, Markdown or JSON files, or add text directly.'}
            />
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
              {filtered.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => { setSelectedId(d.id); setAdding(false); }}
                    className={cx(
                      'w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer',
                      selectedId === d.id ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                    )}
                  >
                    <FileText className="size-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 truncate">{d.title || 'Untitled'}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {formatDateTime(d.created_at)} · {sizeLabel(d.content)}
                      </div>
                    </div>
                    <Badge>{(d.type || 'TEXT').toUpperCase()}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {adding ? (
          <AddTextForm
            onCancel={() => setAdding(false)}
            onSaved={(doc) => {
              setData([doc, ...docs]);
              setAdding(false);
              setSelectedId(doc.id);
            }}
          />
        ) : selected ? (
          <DocumentPanel
            key={selected.id}
            doc={selected}
            onChange={(doc) => setData(docs.map((d) => (d.id === doc.id ? doc : d)))}
            onDeleted={() => {
              setData(docs.filter((d) => d.id !== selected.id));
              setSelectedId(null);
            }}
          />
        ) : (
          <Card>
            <EmptyState title="Select a document" description="Pick a document to read, edit or delete it." />
          </Card>
        )}
      </div>
    </>
  );
}

function AddTextForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (doc: Doc) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const doc = await api<Doc>('/knowledge/text', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim(), entity: 'VED' }),
      });
      if (!doc?.id) throw new Error('The backend did not save the document.');
      onSaved(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Add text" actions={<IconButton icon={X} label="Close" onClick={onCancel} />}>
      <form onSubmit={save} className="space-y-4">
        {error && <Notice>{error}</Notice>}
        <Field label="Title" htmlFor="kb-title">
          <Input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. B.Tech fee structure 2026" />
        </Field>
        <Field label="Content" htmlFor="kb-content" hint="Write facts plainly. The agent quotes from this text.">
          <Textarea id="kb-content" value={content} onChange={(e) => setContent(e.target.value)} required rows={14} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!title.trim() || !content.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DocumentPanel({
  doc,
  onChange,
  onDeleted,
}: {
  doc: Doc;
  onChange: (doc: Doc) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title || '');
  const [content, setContent] = useState(doc.content || '');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const csv = useMemo(() => (doc.type === 'CSV' && doc.content ? parseCsvRecords(doc.content) : null), [doc]);

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      const res = await api<{ document: Doc }>(`/knowledge/${doc.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: title.trim(), content }),
      });
      onChange(res.document);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${doc.title || 'Untitled'}"? The agent will stop using it immediately.`)) return;
    setBusy('delete');
    setError(null);
    try {
      await api(`/knowledge/${doc.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
      setBusy(null);
    }
  };

  return (
    <Card
      title={doc.title || 'Untitled'}
      description={`${(doc.type || 'TEXT').toUpperCase()} · added ${formatDateTime(doc.created_at)}`}
      actions={
        editing ? (
          <>
            <Button size="sm" onClick={() => { setEditing(false); setTitle(doc.title || ''); setContent(doc.content || ''); }}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" loading={busy === 'save'} onClick={save}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <IconButton icon={Trash2} label="Delete document" onClick={remove} disabled={busy === 'delete'} />
          </>
        )
      }
    >
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {editing ? (
        <div className="space-y-4">
          <Field label="Title" htmlFor="doc-title">
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Content" htmlFor="doc-content">
            <Textarea
              id="doc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="font-mono text-[13px]"
            />
          </Field>
        </div>
      ) : csv ? (
        <div className="overflow-auto max-h-[520px] -mx-5 -my-5">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                {csv.columns.map((c) => (
                  <th key={c} className="px-4 py-2.5 font-medium whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csv.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100 align-top">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-zinc-800">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-800">
          {doc.content || 'This document is empty.'}
        </pre>
      )}
    </Card>
  );
}
