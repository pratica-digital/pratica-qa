import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ClipboardList, Plus, Save, Trash2, X } from 'lucide-react';
import type { TestPlan, UpdateTestPlanPayload } from '../../types/testRun';

type SectionDraft = {
  clientId: string;
  title: string;
  description: string;
};

type TestPlanEditPanelProps = {
  testPlan: TestPlan;
  readOnly: boolean;
  onClose: () => void;
  onSave: (testPlan: TestPlan, payload: UpdateTestPlanPayload) => Promise<void>;
};

function generateSectionId() {
  return `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBlankSection(): SectionDraft {
  return {
    clientId: generateSectionId(),
    title: '',
    description: '',
  };
}

function toSectionDrafts(testPlan: TestPlan): SectionDraft[] {
  return (testPlan.sections ?? []).map((section) => ({
    clientId: generateSectionId(),
    title: section.title,
    description: section.content,
  }));
}

export function TestPlanEditPanel({
  testPlan,
  readOnly,
  onClose,
  onSave,
}: TestPlanEditPanelProps) {
  const [name, setName] = useState(testPlan.name);
  const [version, setVersion] = useState(testPlan.version);
  const [description, setDescription] = useState(testPlan.description ?? '');
  const [sections, setSections] = useState<SectionDraft[]>(() => toSectionDrafts(testPlan));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const projectName = testPlan.project?.name ?? 'Project';

  function updateSection(index: number, field: 'title' | 'description', value: string) {
    setSections((current) =>
      current.map((section, currentIndex) =>
        currentIndex === index ? { ...section, [field]: value } : section,
      ),
    );
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function removeSection(index: number) {
    setSections((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSave() {
    const normalizedSections = sections.map((section) => ({
      title: section.title.trim(),
      content: section.description.trim(),
    }));

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!version.trim()) {
      setError('Version is required.');
      return;
    }

    if (description.trim().length > 4000) {
      setError('Description must be 4000 characters or fewer.');
      return;
    }

    if (normalizedSections.length === 0) {
      setError('Add at least one section.');
      return;
    }

    if (normalizedSections.length > 30) {
      setError('Test plans can have up to 30 sections.');
      return;
    }

    if (normalizedSections.some((section) => section.title.length === 0)) {
      setError('Section title is required.');
      return;
    }

    if (normalizedSections.some((section) => section.title.length > 160)) {
      setError('Section title must be 160 characters or fewer.');
      return;
    }

    if (normalizedSections.some((section) => section.content.length === 0)) {
      setError('Section description is required.');
      return;
    }

    if (normalizedSections.some((section) => section.content.length > 8000)) {
      setError('Section description must be 8000 characters or fewer.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(testPlan, {
        name: name.trim(),
        version: version.trim(),
        description: description.trim(),
        sections: normalizedSections,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save test plan.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-slate-50">
      <div className="flex h-dvh w-full flex-col overflow-hidden p-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              Edit test plan
            </h2>
            <p className="truncate text-xs text-slate-500">{projectName}</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Version
              <input
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly || saving}
                onChange={(event) => setVersion(event.target.value)}
                value={version}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              disabled={readOnly || saving}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Sections</h3>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-600 bg-slate-600 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={readOnly || saving}
                onClick={() => setSections((current) => [...current, createBlankSection()])}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add section
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {sections.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No sections defined.
                </p>
              ) : null}

              {sections.map((section, index) => (
                <div
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[2.5rem_1fr_7.5rem]"
                  key={section.clientId}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-600">
                    {index + 1}
                  </span>

                  <div className="space-y-2">
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                      disabled={readOnly || saving}
                      onChange={(event) => updateSection(index, 'title', event.target.value)}
                      placeholder="Section title"
                      value={section.title}
                    />
                    <textarea
                      className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                      disabled={readOnly || saving}
                      onChange={(event) => updateSection(index, 'description', event.target.value)}
                      placeholder="Section description"
                      value={section.description}
                    />
                  </div>

                  <div className="flex h-10 items-center justify-end gap-1">
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={readOnly || saving || index === 0}
                      onClick={() => moveSection(index, -1)}
                      title="Move up"
                      type="button"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={readOnly || saving || index === sections.length - 1}
                      onClick={() => moveSection(index, 1)}
                      title="Move down"
                      type="button"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={readOnly || saving}
                      onClick={() => removeSection(index)}
                      title="Remove section"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm text-red-600">{error}</div>
          <div className="flex justify-end gap-2">
            <button
              className="h-9 rounded-lg bg-slate-600 px-4 text-sm font-medium text-white transition hover:bg-slate-700"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={readOnly || saving}
              onClick={() => void handleSave()}
              type="button"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
