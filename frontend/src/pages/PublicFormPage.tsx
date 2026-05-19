import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";
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
    return <div className="app-bg min-h-screen p-8 text-center muted">Загрузка формы...</div>;
  }

  if (submitted) {
    return (
      <div className="app-bg min-h-screen px-4 py-20">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-xl rounded-2xl border p-6 text-center notice-success">
          <h1 className="font-display text-2xl font-bold">Спасибо!</h1>
          <p className="mt-2 text-sm">Ваш ответ успешно отправлен.</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="app-bg min-h-screen p-8 text-center text-[var(--danger)]">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {error ?? "Форма недоступна"}
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen px-4 py-8">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end">
        <ThemeToggle />
      </div>
      <div className="panel mx-auto mb-5 max-w-3xl p-5">
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">{form.title}</h1>
        {form.description && <p className="mt-2 muted">{form.description}</p>}
        {form.access_mode === "authenticated" && (
          <p className="mt-2 text-sm text-[var(--primary)]">
            Для отправки требуется вход. <Link to="/login" className="font-semibold underline">Войти</Link>
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-4">
        {orderedQuestions.map((question, index) => {
          const value = answers[question.id!];
          const withTime = Boolean(question.config.with_time);
          const isMultiline = Boolean(question.config.multiline);

          return (
            <section key={question.id ?? index} className="panel p-4">
              <h2 className="font-semibold text-[var(--text)]">
                {index + 1}. {question.text}
                {question.is_required && <span className="text-rose-600"> *</span>}
              </h2>
              {question.description && <p className="mt-1 text-sm soft">{question.description}</p>}

              <div className="mt-3">
                {question.type === "text" && !isMultiline && (
                  <input
                    value={(value as string) ?? ""}
                    onChange={(event) => updateAnswer(question, event.target.value)}
                    className="field"
                    required={question.is_required}
                  />
                )}

                {question.type === "text" && isMultiline && (
                  <textarea
                    value={(value as string) ?? ""}
                    onChange={(event) => updateAnswer(question, event.target.value)}
                    rows={4}
                    className="field"
                    required={question.is_required}
                  />
                )}

                {question.type === "single_choice" && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label key={option.id} className="flex items-center gap-2 text-sm muted">
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
                        <label key={option.id} className="flex items-center gap-2 text-sm muted">
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
                    className="field"
                    required={question.is_required}
                  />
                )}

                {question.type === "date" && (
                  <input
                    type={withTime ? "datetime-local" : "date"}
                    value={(value as string) ?? ""}
                    onChange={(event) => updateAnswer(question, event.target.value)}
                    className="field"
                    required={question.is_required}
                  />
                )}
              </div>
            </section>
          );
        })}

        {error && <p className="notice-danger rounded-lg px-3 py-2 text-sm">{error}</p>}

        <button type="submit" className="btn btn-primary w-full">
          Отправить
        </button>
      </form>
    </div>
  );
};
