import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookMarked, 
  Plus, 
  Search, 
  X, 
  AlertCircle, 
  Loader2, 
  Layers, 
  FolderPlus 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import SubjectCard from '../components/SubjectCard';
import SubjectModal from '../components/SubjectModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Subjects() {
  const { user } = useAuth();

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [taskStatsMap, setTaskStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client-side search state
  const [searchQuery, setSearchQuery] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [savingModal, setSavingModal] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch subjects and task counts from Supabase
  const loadSubjectsData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      /**
       * Supabase Queries:
       * 1. Query all subjects belonging to authenticated user ordered by created_at.
       * 2. Query all tasks to aggregate counts (total and completed) grouped by subject_id.
       */
      const [subjectsRes, tasksRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, name, color, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('tasks')
          .select('id, subject_id, is_completed')
          .eq('user_id', user.id),
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      // Group tasks by subject_id to compute counts
      const counts = {};
      (tasksRes.data || []).forEach((t) => {
        if (!t.subject_id) return;
        if (!counts[t.subject_id]) {
          counts[t.subject_id] = { total: 0, completed: 0 };
        }
        counts[t.subject_id].total += 1;
        if (t.is_completed) {
          counts[t.subject_id].completed += 1;
        }
      });

      setSubjects(subjectsRes.data || []);
      setTaskStatsMap(counts);
    } catch (err) {
      console.error('[subjects] Error loading subjects data:', err);
      setError(err.message || 'Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubjectsData();
  }, [loadSubjectsData]);

  // Client-side search filtering
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, searchQuery]);

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (subject) => {
    setEditingSubject(subject);
    setModalOpen(true);
  };

  // Submit Handler for Add / Edit Subject
  const handleSaveSubject = async (formData) => {
    if (!user?.id) return;
    setSavingModal(true);

    try {
      if (formData.id) {
        // EDIT MODE: Update existing subject in Supabase
        const { data, error: updateError } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            color: formData.color,
          })
          .eq('id', formData.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setSubjects((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, ...data } : s))
        );
        setToast({ type: 'success', message: 'Subject updated' });
      } else {
        // ADD MODE: Insert new subject in Supabase
        const { data, error: insertError } = await supabase
          .from('subjects')
          .insert({
            user_id: user.id,
            name: formData.name,
            color: formData.color,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setSubjects((prev) => [...prev, data]);
        // Initialize 0 task stats for newly added subject
        setTaskStatsMap((prev) => ({
          ...prev,
          [data.id]: { total: 0, completed: 0 },
        }));
        setToast({ type: 'success', message: 'Subject added' });
      }

      setModalOpen(false);
    } catch (err) {
      console.error('[subjects] Error saving subject:', err);
      setToast({
        type: 'error',
        message: err.message || 'Could not save subject. Please try again.',
      });
    } finally {
      setSavingModal(false);
    }
  };

  // Delete Handlers
  const handleOpenDeleteDialog = (subject) => {
    setSubjectToDelete(subject);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete || !user?.id) return;
    setDeleting(true);

    try {
      /**
       * Supabase Delete Query:
       * Deletes the subject matching user_id. Cascading rules in the database
       * automatically delete linked tasks.
       */
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
      setTaskStatsMap((prev) => {
        const next = { ...prev };
        delete next[subjectToDelete.id];
        return next;
      });

      setToast({ type: 'success', message: 'Subject deleted' });
      setDeleteDialogOpen(false);
      setSubjectToDelete(null);
    } catch (err) {
      console.error('[subjects] Error deleting subject:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete subject.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* 1. PAGE HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-sm">
              <BookMarked className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#131B2E] dark:text-white">
              Subjects
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#464555] dark:text-slate-400 mt-1 font-medium">
            Organize your courses, track assignments, and monitor your academic progress
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all min-h-[44px] cursor-pointer"
            aria-label="Add new subject"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <button
              onClick={loadSubjectsData}
              className="mt-2 text-xs font-bold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 2. SEARCH & CONTROLS BAR (Shown when there are subjects) */}
      {!loading && subjects.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Client-side Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects by name..."
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-slate-800 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white placeholder-[#777587] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all shadow-sm"
              aria-label="Search subjects"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            {filteredSubjects.length} of {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </span>
        </div>
      )}

      {/* 3. SUBJECT GRID */}
      {loading ? (
        /* Loading Skeleton Grid (1 col mobile, 2 col tablet, 3 col desktop) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-4 animate-pulse shadow-sm"
            >
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        /* Empty State: No subjects registered yet */
        <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EAEDFF] dark:bg-indigo-950/60 text-[#3525CD] dark:text-indigo-400 flex items-center justify-center shadow-md">
            <FolderPlus className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#131B2E] dark:text-white">
            No subjects yet
          </h2>
          <p className="text-xs sm:text-sm text-[#464555] dark:text-slate-400 max-w-md mx-auto mt-1.5 mb-6">
            Add your first subject to start planning assignments, coursework, and review sessions.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#4F46E5]/20 hover:shadow-lg transition-all min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        /* Empty Search Matches */
        <div className="text-center py-12 px-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1E293B]">
          <p className="text-sm font-semibold text-[#131B2E] dark:text-white">
            No subjects match your search.
          </p>
          <p className="text-xs text-[#777587] dark:text-slate-400 mt-1 mb-4">
            Try searching for a different course name or clear your search query.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Responsive Grid: 1 col on mobile, 2 col on tablet, 3 col on desktop (1440px) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              taskStats={taskStatsMap[subject.id] || { total: 0, completed: 0 }}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* 4. ADD / EDIT SUBJECT MODAL */}
      <SubjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveSubject}
        initialData={editingSubject}
        existingSubjects={subjects}
        isSaving={savingModal}
      />

      {/* 5. CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={`Delete ${subjectToDelete?.name || 'Subject'}?`}
        message={`Delete ${subjectToDelete?.name || 'this subject'}? All tasks in this subject will also be deleted. This cannot be undone.`}
        confirmText="Delete Subject"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setSubjectToDelete(null);
          }
        }}
        isLoading={deleting}
        danger={true}
      />
    </div>
  );
}
