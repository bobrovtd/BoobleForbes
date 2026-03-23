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
      setError("?? ??????? ????????? ?????? ????");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const onDelete = async (id: number): Promise<void> => {
    if (!confirm("??????? ????? ? ??? ???????")) {
      return;
    }
    await formsService.remove(id);
    await loadForms();
  };

  const onPublish = async (id: number): Promise<void> => {
    const result = await formsService.publish(id);
    window.prompt("????????? ??????:", result.public_url);
    await loadForms();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">??? ?????</h1>
          <p className="text-sm text-slate-600">??????????, ?????????? ? ???????????? ??????.</p>
        </div>
        <Link
          to="/forms/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          + ??????? ?????
        </Link>
      </div>

      {loading && <p className="text-slate-600">????????...</p>}
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => (
          <article key={form.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">{form.title}</h2>
            <p className="mt-1 text-xs text-slate-500">???????: {new Date(form.created_at).toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">??????: {form.access_mode}</p>
            <p className="mt-1 text-xs text-slate-500">
              ??????: {form.is_published ? "????????????" : "????????"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Link className="rounded border border-slate-300 px-2 py-1" to={`/forms/${form.id}/edit`}>
                ?????????????
              </Link>
              <Link className="rounded border border-slate-300 px-2 py-1" to={`/forms/${form.id}/responses`}>
                ??????
              </Link>
              <button
                type="button"
                onClick={() => onPublish(form.id)}
                className="rounded border border-sky-300 px-2 py-1 text-sky-700"
              >
                ???????????
              </button>
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="rounded border border-rose-300 px-2 py-1 text-rose-700"
              >
                ???????
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && forms.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          ???? ???? ???. ???????? ?????? ????? ??????? ??? ????? AI.
        </div>
      )}
    </div>
  );
};
