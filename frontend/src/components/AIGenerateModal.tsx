import { useState } from "react";

import { formsService } from "@/services/forms";
import { AIGeneratedDraft } from "@/types/forms";

interface AIGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (draft: AIGeneratedDraft) => void;
}

export const AIGenerateModal = ({ open, onClose, onApply }: AIGenerateModalProps): JSX.Element | null => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AIGeneratedDraft | null>(null);

  if (!open) {
    return null;
  }

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const generated = await formsService.generateAI(prompt);
      setDraft(generated);
    } catch {
      setError("?? ??????? ????????????? ?????. ????????? API-???? Cerebras ? ?????????? ?????.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (): void => {
    if (!draft) {
      return;
    }
    onApply(draft);
    setDraft(null);
    setPrompt("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">????????? ????? ?? ????????</h3>
            <p className="mt-1 text-sm text-slate-600">??????? ???????? ?? 2000 ????????.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            ???????
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, 2000))}
          rows={5}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="????????: ?????? ?????? ???????? ????? ?? ???????????..."
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{prompt.length}/2000</span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || prompt.trim().length === 0}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "?????????..." : "?????????????"}
          </button>
        </div>

        {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {draft && (
          <div className="mt-5">
            <h4 className="text-lg font-semibold text-slate-900">????????????</h4>
            <p className="text-sm text-slate-600">{draft.title}</p>
            {draft.description && <p className="mt-1 text-sm text-slate-500">{draft.description}</p>}

            <div className="mt-3 space-y-2">
              {draft.questions.map((question, index) => (
                <div key={index} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="font-medium text-slate-800">
                    {index + 1}. {question.text}
                  </p>
                  <p className="text-sm text-slate-500">???: {question.type}</p>
                  {question.options.length > 0 && (
                    <p className="text-sm text-slate-500">?????: {question.options.map((option) => option.text).join(", ")}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleApply}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
              >
                ????????? ????????
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
