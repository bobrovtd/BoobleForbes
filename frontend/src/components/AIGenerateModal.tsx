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
      setError("Не удалось сгенерировать форму. Проверьте API-ключ Cerebras и повторите попытку.");
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-[var(--text)]">Сгенерировать форму по описанию</h3>
            <p className="mt-1 text-sm muted">Введите описание до 2000 символов.</p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary h-9 px-3 text-sm">
            Закрыть
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, 2000))}
          rows={5}
          className="field"
          placeholder="Например: сделать форму обратной связи по мероприятию..."
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs soft">{prompt.length}/2000</span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || prompt.trim().length === 0}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? "Генерация..." : "Сгенерировать"}
          </button>
        </div>

        {error && <p className="notice-danger mt-3 rounded-lg px-3 py-2 text-sm">{error}</p>}

        {draft && (
          <div className="mt-5">
            <h4 className="text-lg font-semibold text-[var(--text)]">Предпросмотр</h4>
            <p className="text-sm muted">{draft.title}</p>
            {draft.description && <p className="mt-1 text-sm soft">{draft.description}</p>}

            <div className="mt-3 space-y-2">
              {draft.questions.map((question, index) => (
                <div key={index} className="panel-muted p-3">
                  <p className="font-medium text-[var(--text)]">
                    {index + 1}. {question.text}
                  </p>
                  <p className="text-sm soft">Тип: {question.type}</p>
                  {question.options.length > 0 && (
                    <p className="text-sm soft">Ответы: {question.options.map((option) => option.text).join(", ")}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleApply}
                className="btn btn-success"
              >
                Применить результат
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
