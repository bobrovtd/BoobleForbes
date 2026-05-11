import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { formsService } from "@/services/forms";
import { FormListItem } from "@/types/forms";

export const FormsPage = (): JSX.Element => {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForms = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const items = await formsService.listMine();
      setForms(items);
    } catch {
      setError("Не удалось загрузить список форм");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const onDelete = async (id: number): Promise<void> => {
    if (!confirm("Удалить форму и все ответы?")) {
      return;
    }
    await formsService.remove(id);
    await loadForms();
  };

  const onPublish = async (id: number): Promise<void> => {
    const result = await formsService.publish(id);
    window.prompt("Публичная ссылка:", result.public_url);
    await loadForms();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Мои формы</h1>
          <p className="text-sm text-slate-600">Создавайте, публикуйте и анализируйте ответы.</p>
        </div>
        <Link
          to="/forms/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          + Создать форму
        </Link>
      </div>

      {loading && <p className="text-slate-600">Загрузка...</p>}
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => (
          <article key={form.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">{form.title}</h2>
            <p className="mt-1 text-xs text-slate-500">Создана: {new Date(form.created_at).toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Доступ: {form.access_mode}</p>
            <p className="mt-1 text-xs text-slate-500">
              Статус: {form.is_published ? "опубликована" : "черновик"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Link className="rounded border border-slate-300 px-2 py-1" to={`/forms/${form.id}/edit`}>
                Редактировать
              </Link>
              <Link className="rounded border border-slate-300 px-2 py-1" to={`/forms/${form.id}/responses`}>
                Ответы
              </Link>
              <button
                type="button"
                onClick={() => onPublish(form.id)}
                className="rounded border border-sky-300 px-2 py-1 text-sky-700"
              >
                Опубликовать
              </button>
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="rounded border border-rose-300 px-2 py-1 text-rose-700"
              >
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && forms.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Форм пока нет. Создайте первую форму вручную или через AI.
        </div>
      )}
    </div>
  );
};
