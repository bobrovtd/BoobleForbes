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
  { value: "text", label: "Текст" },
  { value: "single_choice", label: "Один вариант" },
  { value: "multiple_choice", label: "Несколько вариантов" },
  { value: "scale", label: "Шкала" },
  { value: "date", label: "Дата" },
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
        { text: "Вариант 1", order_index: 0 },
        { text: "Вариант 2", order_index: 1 },
      ];
    }

    onChange({ ...question, type: nextType, config: nextConfig, options: nextOptions });
  };

  const isChoice = question.type === "single_choice" || question.type === "multiple_choice";

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text)]">Вопрос #{index + 1}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="btn btn-secondary h-8 w-8 p-0 text-xs disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="btn btn-secondary h-8 w-8 p-0 text-xs disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="btn btn-danger h-8 px-2 text-xs"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="label">Тип</span>
          <select
            value={question.type}
            onChange={onTypeChange}
            className="field"
          >
            {QUESTION_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Обязательный</span>
          <input
            type="checkbox"
            checked={question.is_required}
            onChange={(event) => onChange({ ...question, is_required: event.target.checked })}
            className="mt-2 h-4 w-4"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="label">Текст вопроса</span>
        <input
          value={question.text}
          onChange={(event) => onChange({ ...question, text: event.target.value })}
          className="field"
          placeholder="Введите вопрос"
        />
      </label>

      <label className="mt-3 block">
        <span className="label">Описание</span>
        <input
          value={question.description ?? ""}
          onChange={(event) => onChange({ ...question, description: event.target.value })}
          className="field"
          placeholder="Описание (необязательно)"
        />
      </label>

      {question.type === "text" && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label>
            <span className="label">Мин. длина</span>
            <input
              type="number"
              value={String(question.config.min_length ?? "")}
              onChange={(event) => updateConfig("min_length", Number(event.target.value || 0))}
              className="field"
            />
          </label>
          <label>
            <span className="label">Макс. длина</span>
            <input
              type="number"
              value={String(question.config.max_length ?? "")}
              onChange={(event) => updateConfig("max_length", Number(event.target.value || 0))}
              className="field"
            />
          </label>
          <label className="flex items-end gap-2">
            <input
              type="checkbox"
              checked={Boolean(question.config.multiline)}
              onChange={(event) => updateConfig("multiline", event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm muted">Многострочный</span>
          </label>
        </div>
      )}

      {isChoice && (
        <div className="panel-muted mt-3 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text)]">Варианты ответа</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...question,
                  options: [
                    ...question.options,
                    { text: `Вариант ${question.options.length + 1}`, order_index: question.options.length },
                  ],
                })
              }
              className="btn btn-secondary h-8 px-2 text-xs"
            >
              + Вариант
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
                  className="field flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextOptions = question.options
                      .filter((_, currentIndex) => currentIndex !== optionIndex)
                      .map((item, currentIndex) => ({ ...item, order_index: currentIndex }));
                    onChange({ ...question, options: nextOptions });
                  }}
                  className="btn btn-danger h-9 px-3 text-xs"
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
              <span className="text-sm muted">Разрешить "Свой вариант"</span>
            </label>
          )}

          {question.type === "multiple_choice" && (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label>
                <span className="label">Мин. выбрано</span>
                <input
                  type="number"
                  value={String(question.config.min_selected ?? "")}
                  onChange={(event) => updateConfig("min_selected", Number(event.target.value || 0))}
                  className="field"
                />
              </label>
              <label>
                <span className="label">Макс. выбрано</span>
                <input
                  type="number"
                  value={String(question.config.max_selected ?? "")}
                  onChange={(event) => updateConfig("max_selected", Number(event.target.value || 0))}
                  className="field"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {question.type === "scale" && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label>
            <span className="label">Min</span>
            <input
              type="number"
              value={String(question.config.min_value ?? 1)}
              onChange={(event) => updateConfig("min_value", Number(event.target.value))}
              className="field"
            />
          </label>
          <label>
            <span className="label">Max</span>
            <input
              type="number"
              value={String(question.config.max_value ?? 10)}
              onChange={(event) => updateConfig("max_value", Number(event.target.value))}
              className="field"
            />
          </label>
          <label>
            <span className="label">Шаг</span>
            <input
              type="number"
              step="0.1"
              value={String(question.config.step ?? 1)}
              onChange={(event) => updateConfig("step", Number(event.target.value))}
              className="field"
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
          <span className="text-sm muted">Включить время</span>
        </label>
      )}
    </div>
  );
};
