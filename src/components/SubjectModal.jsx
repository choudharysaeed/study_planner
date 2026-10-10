import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Sparkles, Palette, Tag } from 'lucide-react';

export const PRESET_COLORS = [
  { label: 'Indigo', value: '#4F46E5' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
];

export default function SubjectModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null, // null for Add, subject object for Edit
  existingSubjects = [], // for duplicate name check
  isSaving = false,
}) {
  const isEditMode = Boolean(initialData?.id);
  const title = isEditMode ? 'Edit Subject' : 'Add Subject';

  const [name, setName] = useState('');
  const [color, setColor] = useState('#4F46E5');
  const [nameError, setNameError] = useState('');

  const modalRef = useRef(null);
  const nameInputRef = useRef(null);
  const nativeColorInputRef = useRef(null);

  // Initialize or reset form values when opened or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setColor(initialData.color || '#4F46E5');
      } else {
        setName('');
        setColor('#4F46E5');
      }
      setNameError('');

      // Auto focus input
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  // Handle Escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    // 1. Validate empty / length
    if (!trimmedName) {
      setNameError('Subject name is required.');
      nameInputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 40) {
      setNameError('Subject name must be 40 characters or fewer.');
      nameInputRef.current?.focus();
      return;
    }

    // 2. Case-insensitive duplicate check against existing subjects
    const isDuplicate = existingSubjects.some((s) => {
      // If editing, ignore the subject's own current record
      if (isEditMode && s.id === initialData?.id) return false;
      return s.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
      setNameError('You already have a subject with this name.');
      nameInputRef.current?.focus();
      return;
    }

    setNameError('');
    onSubmit({
      id: initialData?.id,
      name: trimmedName,
      color: color || '#4F46E5',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-modal-title"
        className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 max-w-md w-full shadow-2xl transition-colors transform animate-in zoom-in-95 duration-200 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors"
              style={{ backgroundColor: color }}
            >
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="subject-modal-title"
                className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white"
              >
                {title}
              </h2>
              <p className="text-[11px] text-[#777587] dark:text-slate-400">
                {isEditMode
                  ? 'Update course information and accent color'
                  : 'Create a new course category for your tasks'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject Name Input */}
          <div>
            <label
              htmlFor="subject-name-input"
              className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 mb-1.5 uppercase tracking-wider"
            >
              Subject Name *
            </label>
            <input
              id="subject-name-input"
              ref={nameInputRef}
              type="text"
              required
              maxLength={40}
              disabled={isSaving}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Mathematics, Biology, History"
              className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white placeholder-[#777587] transition-all focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 ${
                nameError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[#CBD5E1] dark:border-slate-700 focus:border-[#4F46E5]'
              }`}
            />
            {nameError && (
              <p className="text-xs text-red-500 font-medium mt-1.5 animate-in fade-in">
                {nameError}
              </p>
            )}
            <p className="text-[11px] text-[#777587] dark:text-slate-400 mt-1 flex justify-between">
              <span>Must be unique across your subjects</span>
              <span>{name.length}/40</span>
            </p>
          </div>

          {/* Color Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 uppercase tracking-wider">
                Color Tag
              </label>
              <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase">
                {color}
              </span>
            </div>

            {/* Color Swatches Grid */}
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((preset) => {
                const isSelected = color.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setColor(preset.value)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-[#4F46E5] dark:ring-offset-[#1E293B] scale-110 shadow-sm'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                    aria-label={`Select ${preset.label} color`}
                  />
                );
              })}

              {/* Custom Native Color Picker Swatch */}
              <div className="relative">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => nativeColorInputRef.current?.click()}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-dashed border-slate-300 dark:border-slate-600 hover:border-[#4F46E5] dark:hover:border-indigo-400 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Pick custom color"
                  aria-label="Pick custom color"
                >
                  <Palette className="w-4 h-4" />
                </button>
                <input
                  ref={nativeColorInputRef}
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="sr-only"
                  aria-label="Custom color input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#131B2E] dark:hover:text-white text-xs sm:text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[#4F46E5]/25 hover:shadow-lg flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Subject'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
