import type { TRecursivelyReplaceNullWithUndefined } from "@/types";

export function nullsToUndefined<T>(
  obj: T
): TRecursivelyReplaceNullWithUndefined<T> {
  if (obj === null) {
    return undefined as any;
  }

  // object check based on: https://stackoverflow.com/a/51458052/6489012
  if (obj?.constructor.name === "Object") {
    for (let key in obj) {
      obj[key] = nullsToUndefined(obj[key]) as any;
    }
  }
  return obj as any;
}

type TSuccess<TData> = {
  data: TData;
  error: null;
};

type TFailure<TError> = {
  error: TError;
  data: null;
};

type TResult<T, E = Error> = TSuccess<T> | TFailure<E>;

export async function tryCatch<TData, TError = Error>(
  promise: Promise<TData>
): Promise<TResult<TData, TError>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as TError };
  }
}
