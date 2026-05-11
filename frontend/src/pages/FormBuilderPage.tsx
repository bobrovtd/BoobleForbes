import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AIGenerateModal } from "@/components/AIGenerateModal";
import { QuestionEditor } from "@/components/QuestionEditor";
import { formsService } from "@/services/forms";
import { AccessMode, Form, FormPayload, Question, QuestionType } from "@/types/forms";
import { createEmptyQuestion } from "@/utils/formDefaults";

const emptyFormPayload: FormPayload = {
  title: "",
  description: "",
  access_mode: "unlisted",
  limit_one_per_user: false,
  questions: [],
};

export const FormBuilderPage = (): JSX.Element => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formId, setFormId] = useState<number | null>(id ? Number(id) : null);
  const [payload, setPayload] = useState<FormPayload>(emptyFormPayload);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const form = await formsService.getById(Number(id));
        hydratePayload(form);
      } catch {
        setError("Не удалось загрузить форму");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  const hydratePayload = (form: Form): void => {
    setFormId(form.id);
    setPublicSlug(form.public_slug ?? null);
    setPayload({
      title: form.title,
      description: form.description ?? "",
      access_mode: form.access_mode,
      limit_one_per_user: form.limit_one_per_user,
      questions: form.questions
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((question, index) => ({
          ...question,
          order_index: index,
          description: question.description ?? "",
          options: (question.options ?? []).map((option, optionIndex) => ({
            ...option,
            order_index: optionIndex,
          })),
        })),
    });
  };

  const formPublicUrl = useMemo(() => {
    if (!publicSlug) {
      return null;
    }
    return `${window.location.origin}/f/${publicSlug}`;
  }, [publicSlug]);

  const setQuestionAt = (index: number, nextQuestion: Question): void => {
    const nextQuestions = [...payload.questions];
    nextQuestions[index] = { ...nextQuestion, order_index: index };
    setPayload({ ...payload, questions: nextQuestions });
  };

  const reorderQuestions = (fromIndex: number, toIndex: number): void => {
    const nextQuestions = [...payload.questions];
    const [moved] = nextQuestions.splice(fromIndex, 1);
    nextQuestions.splice(toIndex, 0, moved);
    setPayload({
      ...payload,
      questions: nextQuestions.map((question, index) => ({ ...question, order_index: index })),
    });
  };

  const addQuestion = (type: QuestionType): void => {
    setPayload({
      ...payload,
      questions: [...payload.questions, createEmptyQuestion(payload.questions.length, type)],
    });
  };

  const validateBeforeSave = (): string | null => {
    if (!payload.title.trim()) {
      return "Введите название формы";
    }
    if (payload.questions.length === 0) {
      return "Добавьте хотя бы один вопрос";
    }
    if (payload.questions.length > 100) {
      return "Не больше 100 вопросов";
    }
    if (payload.questions.some((question) => !question.text.trim())) {
      return "Каждый вопрос должен содержать текст";
    }
    return null;
  };

  const buildPayloadForSubmit = (): FormPayload => ({
    ...payload,
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    questions: payload.questions.map((question, index) => ({
      ...question,
      order_index: index,
      options: (question.options ?? []).map((option, optionIndex) => ({
        text: option.text,
        order_index: optionIndex,
      })),
    })),
  });

  const saveForm = async (): Promise<void> => {
    const validationError = validateBeforeSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const submitPayload = buildPayloadForSubmit();
      if (formId) {
        const updated = await formsService.update(formId, submitPayload);
        hydratePayload(updated);
      } else {
        const created = await formsService.create(submitPayload);
        hydratePayload(created);
        navigate(`/forms/${created.id}/edit`, { replace: true });
      }
      setSuccess("Форма сохранена");
    } catch {
      setError("Ошибка сохранения формы");
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async (): Promise<void> => {
    if (!formId) {
      setError("Сначала сохраните форму");
      return;
    }

    try {
      const result = await formsService.publish(formId);
      setPublicSlug(result.public_slug);
      window.prompt("Публичная ссылка:", result.public_url);
    } catch {
      setError("Не удалось опубликовать форму");
    }
  };

  if (loading) {
    return <p className="text-slate-600">Загрузка формы...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            {isEdit ? "Редактирование формы" : "Новая форма"}
          </h1>
          <p className="text-sm text-slate-600">Настройте вопросы и параметры публикации с помощью AI.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAIModalOpen(true)}
            className="rounded-md border border-sky-300 px-3 py-2 text-sm text-sky-700"
          >
            Сгенерировать по описанию
          </button>
          <button
            type="button"
            onClick={saveForm}
            disabled={saving}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={publishForm}
            className="rounded-md border border-emerald-300 px-3 py-2 text-sm text-emerald-700"
          >
            Опубликовать
          </button>
        </div>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      {formPublicUrl && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Публичная ссылка: <Link className="underline" to={`/f/${publicSlug}`}>{formPublicUrl}</Link>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Название</span>
            <input
              value={payload.title}
              onChange={(event) => setPayload({ ...payload, title: event.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="Название формы"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Режим доступа</span>
            <select
              value={payload.access_mode}
              onChange={(event) => setPayload({ ...payload, access_mode: event.target.value as AccessMode })}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="public">public</option>
              <option value="unlisted">unlisted</option>
              <option value="authenticated">authenticated</option>
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Описание</span>
          <textarea
            value={payload.description ?? ""}
            onChange={(event) => setPayload({ ...payload, description: event.target.value })}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={payload.limit_one_per_user}
            onChange={(event) => setPayload({ ...payload, limit_one_per_user: event.target.checked })}
            className="h-4 w-4"
          />
          Ограничить одним ответом на пользователя (только для авторизованных)
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Добавить вопрос:</span>
          {["text", "single_choice", "multiple_choice", "scale", "date"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addQuestion(type as QuestionType)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
            >
              {type}
            </button>
          ))}
        </div>

        {payload.questions.map((question, index) => (
          <QuestionEditor
            key={`${question.id ?? "new"}-${index}`}
            question={question}
            index={index}
            onChange={(nextQuestion) => setQuestionAt(index, nextQuestion)}
            onRemove={() =>
              setPayload({
                ...payload,
                questions: payload.questions
                  .filter((_, currentIndex) => currentIndex !== index)
                  .map((item, currentIndex) => ({ ...item, order_index: currentIndex })),
              })
            }
            onMoveUp={() => reorderQuestions(index, index - 1)}
            onMoveDown={() => reorderQuestions(index, index + 1)}
            canMoveUp={index > 0}
            canMoveDown={index < payload.questions.length - 1}
          />
        ))}

        {payload.questions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            В форме пока нет вопросов.
          </div>
        )}
      </section>

      <AIGenerateModal
        open={isAIModalOpen}
        onClose={() => setAIModalOpen(false)}
        onApply={(draft) => {
          setPayload({
            title: draft.title,
            description: draft.description ?? "",
            access_mode: draft.access_mode,
            limit_one_per_user: draft.limit_one_per_user,
            questions: draft.questions.map((question, index) => ({
              ...question,
              order_index: index,
              description: question.description ?? "",
              options: question.options.map((option, optionIndex) => ({ ...option, order_index: optionIndex })),
            })),
          });
        }}
      />
    </div>
  );
};
