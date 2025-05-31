import { NextRequest } from "next/server";
import * as yup from "yup";

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function validateRequestSchema<T>(
  schema: yup.Schema<T>,
  value: unknown
): Promise<ValidationResult<T>> {
  try {
    const data = await schema.validate(value, { abortEarly: false });
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string[]> = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = [err.message];
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { _error: ["Validation failed"] } };
  }
} 