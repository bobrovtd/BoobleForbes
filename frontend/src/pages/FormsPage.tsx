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
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">Мои формы</h1>
          <p className="text-sm muted">Создавайте, публикуйте и анализируйте ответы.</p>
        </div>
        <Link
          to="/forms/new"
          className="btn btn-primary"
        >
          + Создать форму
        </Link>
      </div>

      {loading && <p className="muted">Загрузка...</p>}
      {error && <p className="notice-danger rounded-lg px-3 py-2 text-sm">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => (
          <article key={form.id} className="panel p-4 transition hover:-translate-y-0.5">
            <h2 className="font-semibold text-[var(--text)]">{form.title}</h2>
            <p className="mt-1 text-xs soft">Создана: {new Date(form.created_at).toLocaleString()}</p>
            <p className="mt-1 text-xs soft">Доступ: {form.access_mode}</p>
            <p className="mt-1 text-xs soft">
              Статус: {form.is_published ? "опубликована" : "черновик"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Link className="btn btn-secondary h-8 px-2 text-xs" to={`/forms/${form.id}/edit`}>
                Редактировать
              </Link>
              <Link className="btn btn-secondary h-8 px-2 text-xs" to={`/forms/${form.id}/responses`}>
                Ответы
              </Link>
              <button
                type="button"
                onClick={() => onPublish(form.id)}
                className="btn btn-primary h-8 px-2 text-xs"
              >
                Опубликовать
              </button>
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="btn btn-danger h-8 px-2 text-xs"
              >
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && forms.length === 0 && (
        <div className="panel border-dashed p-6 text-sm muted">
          Форм пока нет. Создайте первую форму вручную или через AI.
        </div>
      )}
    </div>
  );
};
