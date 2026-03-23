import { ChangeEvent } from "react";

import { Question, QuestionType } from "@/types/forms";

interface QuestionEditorProps {
  question: Question;
  index: number;
  onChange: (next: Question) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: "text", label: "?????" },
  { value: "single_choice", label: "????????? ?????" },
  { value: "multiple_choice", label: "????????????? ?????" },
  { value: "scale", label: "?????" },
  { value: "date", label: "????" },
];

export const QuestionEditor = ({
  question,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: QuestionEditorProps): JSX.Element => {
  const updateConfig = (key: string, value: unknown): void => {
    onChange({ ...question, config: { ...question.config, [key]: value } });
  };

  const onTypeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextType = event.target.value as QuestionType;
    let nextConfig: Record<string, unknown> = {};
    let nextOptions = [];

    if (nextType === "scale") {
      nextConfig = { min_value: 1, max_value: 10, step: 1 };
    }

    if (nextType === "single_choice" || nextType === "multiple_choice") {
      nextOptions = [
        { text: "??????? 1", order_index: 0 },
        { text: "??????? 2", order_index: 1 },
      ];
    }

    onChange({ ...question, type: nextType, config: nextConfig, options: nextOptions });
  };

  const isChoice = question.type === "single_choice" || question.type === "multiple_choice";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">?????? #{index + 1}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
          >
            ?
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
          >
            ?
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600"
          >
            ???????
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">???</span>
          <select
            value={question.type}
            onChange={onTypeChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {QUESTION_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">????????????</span>
          <input
            type="checkbox"
            checked={question.is_required}
            onChange={(event) => onChange({ ...question, is_required: event.target.checked })}
            className="mt-2 h-4 w-4"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">????? ???????</span>
        <input
          value={question.text}
          onChange={(event) => onChange({ ...question, text: event.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="??????? ??????"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">?????????</span>
        <input
          value={question.description ?? ""}
          onChange={(event) => onChange({ ...question, description: event.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="???????? (?????????????)"
        />
      </label>

      {question.type === "text" && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">???. ?????</span>
            <input
              type="number"
              value={String(question.config.min_length ?? "")}
              onChange={(event) => updateConfig("min_length", Number(event.target.value || 0))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">????. ?????</span>
            <input
              type="number"
              value={String(question.config.max_length ?? "")}
              onChange={(event) => updateConfig("max_length", Number(event.target.value || 0))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex items-end gap-2">
            <input
              type="checkbox"
              checked={Boolean(question.config.multiline)}
              onChange={(event) => updateConfig("multiline", event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-700">?????????????</span>
          </label>
        </div>
      )}

      {isChoice && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">???????? ??????</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...question,
                  options: [
                    ...question.options,
                    { text: `??????? ${question.options.length + 1}`, order_index: question.options.length },
                  ],
                })
              }
              className="rounded-md border border-sky-300 px-2 py-1 text-xs text-sky-700"
            >
              + ???????
            </button>
          </div>

          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <input
                  value={option.text}
                  onChange={(event) => {
                    const nextOptions = [...question.options];
                    nextOptions[optionIndex] = { ...option, text: event.target.value };
                    onChange({ ...question, options: nextOptions });
                  }}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextOptions = question.options
                      .filter((_, currentIndex) => currentIndex !== optionIndex)
                      .map((item, currentIndex) => ({ ...item, order_index: currentIndex }));
                    onChange({ ...question, options: nextOptions });
                  }}
                  className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          {question.type === "single_choice" && (
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(question.config.allow_other)}
                onChange={(event) => updateConfig("allow_other", event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-slate-700">????????? "???? ???????"</span>
            </label>
          )}

          {question.type === "multiple_choice" && (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm">???. ?????????</span>
                <input
                  type="number"
                  value={String(question.config.min_selected ?? "")}
                  onChange={(event) => updateConfig("min_selected", Number(event.target.value || 0))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm">????. ?????????</span>
                <input
                  type="number"
                  value={String(question.config.max_selected ?? "")}
                  onChange={(event) => updateConfig("max_selected", Number(event.target.value || 0))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {question.type === "scale" && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Min</span>
            <input
              type="number"
              value={String(question.config.min_value ?? 1)}
              onChange={(event) => updateConfig("min_value", Number(event.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Max</span>
            <input
              type="number"
              value={String(question.config.max_value ?? 10)}
              onChange={(event) => updateConfig("max_value", Number(event.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">???</span>
            <input
              type="number"
              step="0.1"
              value={String(question.config.step ?? 1)}
              onChange={(event) => updateConfig("step", Number(event.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      )}

      {question.type === "date" && (
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(question.config.with_time)}
            onChange={(event) => updateConfig("with_time", event.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-slate-700">???????? ?????</span>
        </label>
      )}
    </div>
  );
};
