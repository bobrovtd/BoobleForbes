import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { formsService } from "@/services/forms";
import { FormAnalytics, ResponseRow } from "@/types/forms";

export const ResponsesPage = (): JSX.Element => {
  const { id } = useParams();
  const formId = Number(id);

  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [responseRows, analyticsData] = await Promise.all([
        formsService.responses(formId),
        formsService.analytics(formId),
      ]);
      setResponses(responseRows);
      setAnalytics(analyticsData);
    } catch {
      setError("Не удалось загрузить ответы");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [formId]);

  const answerColumns = useMemo(() => {
    const keys = new Set<string>();
    responses.forEach((row) => {
      Object.keys(row.answers).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [responses]);

  const onExport = async (): Promise<void> => {
    const blob = await formsService.exportCsv(formId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `form_${formId}_responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Ответы и аналитика</h1>
          <p className="text-sm text-slate-600">Форма #{formId}</p>
        </div>

        <div className="flex gap-2">
          <Link to={`/forms/${formId}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
            К форме
          </Link>
          <button
            type="button"
            onClick={onExport}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white"
          >
            Скачать CSV
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-600">Загрузка...</p>}
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {analytics && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Сводка</h2>
            <p className="mt-2 text-sm text-slate-700">Всего ответов: {analytics.total_responses}</p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Числовые вопросы</h2>
            <div className="mt-2 space-y-3">
              {analytics.scale_questions.map((item) => (
                <div key={item.question_id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">{item.question_text}</p>
                  <p className="text-slate-600">Среднее: {item.average ?? "-"}</p>
                  <p className="text-slate-600">Медиана: {item.median ?? "-"}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {analytics && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Варианты</h2>
            <div className="mt-3 space-y-3">
              {analytics.choice_questions.map((item) => (
                <div key={item.question_id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">{item.question_text}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {Object.entries(item.counts).map(([option, count]) => (
                      <li key={option} className="flex justify-between">
                        <span>{option}</span>
                        <span>{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Текстовые ответы</h2>
            <div className="mt-3 space-y-3">
              {analytics.text_questions.map((item) => (
                <div key={item.question_id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">{item.question_text}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {item.responses.slice(0, 10).map((text, index) => (
                      <li key={index}>{text}</li>
                    ))}
                    {item.responses.length === 0 && <li>Нет ответов</li>}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      <section className="overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Таблица ответов</h2>
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Пользователь</th>
              <th className="px-2 py-2">Дата</th>
              {answerColumns.map((column) => (
                <th key={column} className="px-2 py-2">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.map((row) => (
              <tr key={row.response_id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2">{row.response_id}</td>
                <td className="px-2 py-2">{row.respondent_id ?? "аноним"}</td>
                <td className="px-2 py-2">{new Date(row.submitted_at).toLocaleString()}</td>
                {answerColumns.map((column) => (
                  <td key={`${row.response_id}-${column}`} className="px-2 py-2">
                    {formatCellValue(row.answers[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {responses.length === 0 && <p className="mt-2 text-sm text-slate-500">Пока нет ответов.</p>}
      </section>
    </div>
  );
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};
