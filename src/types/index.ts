import DbSchema from "@/lib/db";

export interface IEnvironment  {
  DATABASE_URL: string;
  REDIS_URL: string;
  REDIS_TOKEN: string;
}

export interface IApiResponse<TData = unknown> {
  success: boolean;
  status: {
    code: number;
    message: string;
  };
  requestId: string;
  timestamp: string;
  data?: TData;
  error?: IApiError;
  pagination?: IPaginationInfo;
  rateLimit?: IRateLimitInfo;
}

export interface IApiError {
  code: string;
  message: string;
  details?: unknown;
  path?: string;
  stack?: string;
  errors?: IValidationError[];
}

export interface IValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface IPaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPageUrl?: string;
  previousPageUrl?: string;
}

export interface IRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface IScrewData {
  name: string;
  description: string;
  videos: IVideoData[];
  type: number;
  material: number;
  stock: string;
  others: IOthersData[];
  price: string;
  images: IImageData[];
  note: string;
  size: number;
  data?: TScrewJsonData;
}

export type TScrewJsonData = Pick<IScrewData, "videos" | "images" | "others">;

export interface IImageData {
  id: string;
  url: string;
}

export interface IVideoData {
  id: string;
  url: string;
}

export interface ICategoryData {
  id: string;
  name: string;
  description: string;
}

export interface IMaterialData {
  id: string;
  name: string;
  description: string;
}

export interface IOthersData {
  id: string;
  name: string;
  description: string;
}

export interface INoteData {
  id: string;
  descruption: string;
}

export type TRecursivelyReplaceNullWithUndefined<T> = T extends null
  ? undefined
  : T extends Date
  ? T
  : {
      [K in keyof T]: T[K] extends (infer U)[]
        ? TRecursivelyReplaceNullWithUndefined<U>[]
        : TRecursivelyReplaceNullWithUndefined<T[K]>;
    };

export interface IImportResult {
  rowsCount: number;
};

export interface IScrewTypeDto {
  id: number;
  name?: string;
}

export interface IScrewMaterialDto {
  id: number;
  name?: string;
}

export type TScrewEntity = Omit<typeof DbSchema.Screw.$inferSelect, "id">
export type TServerCreateScrewDto = TRecursivelyReplaceNullWithUndefined<typeof DbSchema.Screw.$inferInsert>