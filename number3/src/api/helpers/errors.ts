import { NextRequest, NextResponse } from "next/server";

export interface ErrorResponseParams {
  statusCode: number;
  code: string;
  detail: string;
  attribute?: string;
  error?: string;
  errors?: Record<string, string[]>;
  request: NextRequest;
}

export function errorResponse({
  statusCode,
  code,
  detail,
  attribute,
  error,
  errors,
  request,
}: ErrorResponseParams) {
  console.error(`[${request.method} ${request.url}] Error:`, {
    code,
    detail,
    attribute,
    error,
    errors,
  });

  return NextResponse.json(
    {
      error: {
        code,
        detail,
        ...(attribute && { attribute }),
        ...(error && { error }),
        ...(errors && { errors }),
      },
    },
    { status: statusCode }
  );
} 