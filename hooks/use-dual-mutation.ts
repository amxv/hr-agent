"use client";

import type { DefaultError } from "@tanstack/query-core";
import {
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
} from "@tanstack/react-query";

export type UseDualMutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> = UseMutationOptions<TData, TError, TVariables, TContext> & {
  localMutationFn?: (variables: TVariables) => Promise<TData> | TData;
  shouldUseLocal: boolean | (() => boolean);
};

export function useDualMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  options: UseDualMutationOptions<TData, TError, TVariables, TContext>,
  queryClient?: QueryClient
): UseMutationResult<TData, TError, TVariables, TContext> {
  const {
    mutationFn,
    localMutationFn,
    shouldUseLocal,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...rest
  } = options;

  const useLocal =
    typeof shouldUseLocal === "function" ? shouldUseLocal() : shouldUseLocal;

  const mergedOptions: UseMutationOptions<TData, TError, TVariables, TContext> =
    {
      ...rest,
      mutationFn: async (variables) => {
        if (useLocal) {
          if (!localMutationFn) {
            throw new Error(
              "localMutationFn is required when shouldUseLocal is true"
            );
          }
          return await localMutationFn(variables);
        }
        if (!mutationFn) {
          throw new Error(
            "mutationFn is required when shouldUseLocal is false"
          );
        }
        return await mutationFn(variables);
      },
      onMutate: async (variables) => {
        if (onMutate) {
          return await onMutate(variables);
        }
        return;
      },
      onError: (error, variables, context) => {
        if (onError) {
          onError(error, variables, context);
        }
      },
      onSuccess: (data, variables, context) => {
        if (onSuccess) {
          onSuccess(data, variables, context);
        }
      },
      onSettled: (data, error, variables, context) => {
        if (onSettled) {
          onSettled(data, error, variables, context);
        }
      },
    };

  return useMutation<TData, TError, TVariables, TContext>(
    mergedOptions,
    queryClient
  );
}
