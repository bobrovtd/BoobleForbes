import { Link } from "react-router-dom";

export const NotFoundPage = (): JSX.Element => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900">404</h1>
        <p className="mt-2 text-slate-600">???????? ?? ???????</p>
        <Link to="/forms" className="mt-4 inline-block rounded-md bg-sky-600 px-4 py-2 text-white">
          ?? ???????
        </Link>
      </div>
    </div>
  );
};
