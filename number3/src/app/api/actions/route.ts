import { errorResponse } from "@/api/helpers/errors";
import { verifyHashedSecret } from "@/api/helpers/utils";
import { validateRequestSchema } from "@/api/helpers/validate-request-schema";
import { NextRequest, NextResponse } from "next/server";
import * as yup from "yup";

const createActionBodySchema = yup.object({
  action: yup.string().strict().required(),
  description: yup.string().strict().required(),
  max_verifications: yup.number().integer().min(1).required(),
});

const createActionParamsSchema = yup.object({
  app_id: yup.string().strict().required(),
});

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return errorResponse({
        statusCode: 401,
        code: "unauthorized",
        detail: "API key is required",
        request,
      });
    }

    // In a real implementation, verify the API key with World ID's service
    // For now, we'll just check if it matches our environment variable
    if (apiKey !== process.env.WORLD_ID_API_KEY) {
      return errorResponse({
        statusCode: 401,
        code: "unauthorized",
        detail: "Invalid API key",
        request,
      });
    }

    // Get and validate request parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      app_id: searchParams.get("app_id"),
    };

    const paramsValidation = await validateRequestSchema(
      createActionParamsSchema,
      params
    );

    if (!paramsValidation.isValid) {
      return errorResponse({
        statusCode: 400,
        code: "validation_error",
        detail: "Invalid request parameters",
        errors: paramsValidation.errors,
        request,
      });
    }

    // Get and validate request body
    const body = await request.json();
    const bodyValidation = await validateRequestSchema(
      createActionBodySchema,
      body
    );

    if (!bodyValidation.isValid) {
      return errorResponse({
        statusCode: 400,
        code: "validation_error",
        detail: "Invalid request body",
        errors: bodyValidation.errors,
        request,
      });
    }

    // In a real implementation, create the action via World ID's API
    // For now, we'll return a mock response
    const response = {
      action_id: `action_${Date.now()}`,
      app_id: paramsValidation.data?.app_id,
      action: bodyValidation.data?.action,
      description: bodyValidation.data?.description,
      max_verifications: bodyValidation.data?.max_verifications,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating action:", error);
    return errorResponse({
      statusCode: 500,
      code: "internal_error",
      detail: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
      request,
    });
  }
} 