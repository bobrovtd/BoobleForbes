import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { formsService } from "@/services/forms";
import { PublicForm, Question } from "@/types/forms";

export const PublicFormPage = (): JSX.Element => {
  const { slug } = useParams();

  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const data = await formsService.getPublicBySlug(slug);
        setForm(data);
      } catch {
        setError("Форма недоступна или не найдена");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const orderedQuestions = useMemo(() => {
    if (!form) {
      return [];
    }
    return [...form.questions].sort((a, b) => a.order_index - b.order_index);
  }, [form]);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!form) {
      return;
    }

    try {
      const payload = {
        answers: orderedQuestions
          .filter((question) => answers[question.id!] !== undefined && answers[question.id!] !== "")
          .map((question) => ({
            question_id: question.id!,
            value: answers[question.id!],
          })),
      };

      await formsService.submit(form.id, payload);
      setSubmitted(true);
      setError(null);
    } catch {
      setError("Не удалось отправить форму. Проверьте заполненные поля.");
    }
  };

  const updateAnswer = (question: Question, value: unknown): void => {
    setAnswers((prev) => ({ ...prev, [question.id!]: value }));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Загрузка формы...</div>;
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-20 max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-emerald-800">Спасибо!</h1>
        <p className="mt-2 text-sm text-emerald-700">Ваш ответ успешно отправлен.</p>
      </div>
    );
  }

  if (!form) {
    return <div className="p-8 text-center text-rose-700">{error ?? "Форма недоступна"}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-display text-3xl font-bold text-slate-900">{form.title}</h1>
        {form.description && <p className="mt-2 text-slate-600">{form.description}</p>}
        {form.access_mode === "authenticated" && (
          <p className="mt-2 text-sm text-sky-700">
            Для отправки требуется вход. <Link to="/login" className="underline">Войти</Link>
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {orderedQuestions.map((question, index) => {
          const value = answers[question.id!];
          const withTime = Boolean(question.config.with_time);
          const isMultiline = Boolean(question.config.multiline);

          return (
            <section key={question.id ?? index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                {index + 1}. {question.text}
                {question.is_required && <span className="text-rose-600"> *</span>}
              </h2>
              {question.description && <p className="mt-1 text-sm text-slate-500">{question.description}</p>}

              <div className="mt-3">
                {question.type === "text" && !isMultiline && (
                  <input
                    value={(value as string) ?? ""}
                    onChange={(event) => updateAnswer(question, event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    required={question.is_required}
                  />
                )}

                {question.type === "text" && isMultiline && (
                  <textarea
                    value={(value as string) ?? ""}
                    onChange={(event) => updateAnswer(question, event.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    required={question.is_required}
                  />
                )}

                {question.type === "single_choice" && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name={`q-${question.id}`}
                          checked={value === option.id}
                          onChange={() => updateAnswer(question, option.id)}
                          required={question.is_required}
                        />
                        {option.text}
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const current = Array.isArray(value) ? (value as number[]) : [];
                      const checked = current.includes(option.id ?? -1);

                      return (
                        <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...current, option.id as number]
                                : current.filter((item) => item !== option.id);
                              updateAnswer(question, next);
                            }}
                          />
                          {option.text}
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.type === "scale" && (
                  <input
                    type="number"
                    value={value !== undefined ? String(value) : ""}
                    min={Number(question.config.min_value ?? 1)}
                    max={Number(question.config.max_value ?? 10)}
                    step={Number(question.config.step ?? 1)}
                    onChange={(event) => updateAnswer(question, Number(event.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    required={question.is_required}
                  />
                )}

                {question.type === "date" && (
                  <input
                    type={withTime ? "datetime-local" : "date"}
                    value={(value as string) ?? ""}
                    onChange={(event) => updateAnswer(question, event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    required={question.is_required}
                  />
                )}
              </div>
            </section>
          );
        })}

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <button type="submit" className="w-full rounded-md bg-sky-600 px-4 py-2 font-medium text-white">
          Отправить
        </button>
      </form>
    </div>
  );
};
