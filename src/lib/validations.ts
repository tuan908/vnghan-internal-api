import { z } from "zod";

export const ScrewSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  quantity: z.string().min(1, "Vui lòng nhập số lượng"),
  componentType: z.string().min(1, "Vui lòng chọn phân loại"),
  material: z.string().min(1, "Vui lòng chọn chất liệu"),
  category: z.string().optional(),
  price: z.string().superRefine((value, ctx) => {
    if (value === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập giá tham khảo",
      });
    }

    if (Number.isNaN(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập số",
      });
    }

    if (Number(value) < 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Giá tham khảo phải lớn hơn 1000 VND",
      });
    }
  }),
  note: z.string().optional(),
  size: z.string().optional(),
});

export type TScrewDto = z.infer<typeof ScrewSchema>

// Define schemas for each form type
export const createInstructionSchema = z.object({
  componentType: z.string().min(1, "Vui lòng chọn loại phụ kiện"),
  instruction: z.string().min(1, "Vui lòng nhập hướng dẫn"),
});

export type TCreateInstructionDto = z.infer<typeof createInstructionSchema>;

export const createQuestionSchema = z.object({
  componentType: z.string().min(1, "Vui lòng chọn loại phụ kiện"),
  question: z.string().min(1, "Vui lòng nhập câu hỏi"),
  answer: z.string().min(1, "Vui lòng nhập câu trả lời"),
});

export type TCreateQuestionDto = z.infer<typeof createQuestionSchema>;
