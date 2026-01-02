"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FieldErrors } from "react-hook-form";

interface UseFormErrorHandlerOptions {
  /** The form errors object from react-hook-form */
  errors: FieldErrors;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
}

interface UseFormErrorHandlerReturn {
  /** Ref to attach to the form element for scroll-to-error functionality */
  formRef: React.RefObject<HTMLFormElement | null>;
  /** Whether there are any validation errors */
  hasErrors: boolean;
  /** Number of validation errors */
  errorCount: number;
  /** Scroll to the first error in the form */
  scrollToFirstError: () => void;
}

/**
 * Hook to handle form validation errors with scroll-to-error functionality.
 *
 * Usage:
 * ```tsx
 * const { formRef, hasErrors, errorCount, scrollToFirstError } = useFormErrorHandler({
 *   errors: formState.errors,
 *   isSubmitting: formState.isSubmitting,
 * });
 *
 * // Attach ref to form
 * <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
 *
 * // Show error summary near submit button
 * {hasErrors && (
 *   <FormErrorSummary errorCount={errorCount} />
 * )}
 * ```
 */
export function useFormErrorHandler({
  errors,
  isSubmitting,
}: UseFormErrorHandlerOptions): UseFormErrorHandlerReturn {
  const formRef = useRef<HTMLFormElement>(null);
  const previousSubmittingRef = useRef(false);

  // Count errors (including nested)
  const countErrors = useCallback((errs: FieldErrors): number => {
    let count = 0;
    for (const key of Object.keys(errs)) {
      const error = errs[key];
      if (error?.message) {
        count++;
      } else if (error && typeof error === "object") {
        count += countErrors(error as FieldErrors);
      }
    }
    return count;
  }, []);

  const errorCount = countErrors(errors);
  const hasErrors = errorCount > 0;

  const scrollToFirstError = useCallback(() => {
    if (!formRef.current) return;

    // Find the first element with an error - look for aria-invalid or data-invalid
    const firstErrorElement = formRef.current.querySelector(
      '[aria-invalid="true"], [data-invalid="true"], .text-destructive'
    );

    if (firstErrorElement) {
      // Scroll the element into view with some offset
      firstErrorElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Try to focus the input if it's focusable
      const focusableInput = firstErrorElement.closest("div")?.querySelector(
        'input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableInput && focusableInput instanceof HTMLElement) {
        setTimeout(() => focusableInput.focus(), 300);
      }
    }
  }, []);

  // Auto-scroll to first error when submission fails (isSubmitting goes from true to false with errors)
  useEffect(() => {
    if (previousSubmittingRef.current && !isSubmitting && hasErrors) {
      scrollToFirstError();
    }
    previousSubmittingRef.current = isSubmitting ?? false;
  }, [isSubmitting, hasErrors, scrollToFirstError]);

  return {
    formRef,
    hasErrors,
    errorCount,
    scrollToFirstError,
  };
}

interface FormErrorSummaryProps {
  /** Number of errors to display */
  errorCount: number;
  /** Additional class name */
  className?: string;
}

/**
 * Component to display a form error summary near the submit button.
 */
export function FormErrorSummary({ errorCount, className = "" }: FormErrorSummaryProps) {
  if (errorCount === 0) return null;

  return (
    <p className={`text-sm text-destructive ${className}`}>
      Please fix {errorCount} {errorCount === 1 ? "error" : "errors"} above to continue
    </p>
  );
}
