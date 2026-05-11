import { Question, QuestionType } from "@/types/forms";

export const createEmptyQuestion = (orderIndex: number, type: QuestionType = "text"): Question => ({
  type,
  text: "",
  description: "",
  order_index: orderIndex,
  is_required: false,
  config: type === "scale" ? { min_value: 1, max_value: 10, step: 1 } : {},
  options:
    type === "single_choice" || type === "multiple_choice"
      ? [
          { text: "Вариант 1", order_index: 0 },
          { text: "Вариант 2", order_index: 1 },
        ]
      : [],
});
