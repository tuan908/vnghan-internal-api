import { RecursivelyReplaceNullWithUndefined } from "@/types";

export function nullsToUndefined<T>(
    obj: T
  ): RecursivelyReplaceNullWithUndefined<T> {
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