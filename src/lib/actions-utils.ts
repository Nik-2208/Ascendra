import { z } from "zod";

export type ActionResponse<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; issues?: z.ZodIssue[] };

export function successResponse<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function errorResponse(error: string, issues?: z.ZodIssue[]): ActionResponse<never> {
  return { success: false, error, issues };
}

export async function executeSecureAction<T>(
  actionFn: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const result = await actionFn();
    return successResponse(result);
  } catch (error) {
    // Securely log the error on the server side
    console.error("[SECURE_ACTION_ERROR]:", error);
    
    // Return a generic/sanitized error message to the client
    const errorMessage = error instanceof Error ? error.message : "An unexpected security or database error occurred.";
    return errorResponse(errorMessage);
  }
}
