import { useTheme } from "@/contexts/ThemeContext";

export const ThemeToggle = (): JSX.Element => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn-secondary h-10 px-3"
      aria-label={isDark ? "Включить светлую тему" : "Включить темную тему"}
      title={isDark ? "Светлая тема" : "Темная тема"}
    >
      <span
        aria-hidden="true"
        className="relative h-4 w-4 rounded-full border border-current before:absolute before:inset-1 before:rounded-full before:bg-current"
      />
      <span className="hidden sm:inline">{isDark ? "Светлая" : "Темная"}</span>
    </button>
  );
};
