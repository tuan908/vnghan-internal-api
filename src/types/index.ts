import SCHEMA from "@/lib/db";

export interface Env  {
  DATABASE_URL: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  status: {
    code: number;
    message: string;
  };
  requestId: string;
  timestamp: string;
  data?: T;
  error?: ApiError;
  pagination?: PaginationInfo;
  rateLimit?: RateLimitInfo;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  path?: string;
  stack?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPageUrl?: string;
  previousPageUrl?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ScrewData {
  name: string;
  description: string;
  videos: VideoData[];
  type: number;
  material: number;
  stock: string;
  others: OthersData[];
  price: string;
  images: ImageData[];
  note: string;
  size: number;
  data?: ScrewJsonData;
}

export type ScrewJsonData = Pick<ScrewData, "videos" | "images" | "others">;

export interface ImageData {
  id: string;
  url: string;
}

export interface VideoData {
  id: string;
  url: string;
}

export interface CategoryData {
  id: string;
  name: string;
  description: string;
}

export interface MaterialData {
  id: string;
  name: string;
  description: string;
}

export interface OthersData {
  id: string;
  name: string;
  description: string;
}

export interface NoteData {
  id: string;
  descruption: string;
}

export type RecursivelyReplaceNullWithUndefined<T> = T extends null
  ? undefined
  : T extends Date
  ? T
  : {
      [K in keyof T]: T[K] extends (infer U)[]
        ? RecursivelyReplaceNullWithUndefined<U>[]
        : RecursivelyReplaceNullWithUndefined<T[K]>;
    };

export type ImportResult = {
  rowsCount: number;
};

export type ScrewTypeDto = {
  id: number;
  name?: string;
}

export type ScrewMaterialDto = {
  id: number;
  name?: string;
}

export type ScrewEntity = Omit<typeof SCHEMA.SCREW.$inferSelect, "id">
export type ServerCreateScrewDto = RecursivelyReplaceNullWithUndefined<typeof SCHEMA.SCREW.$inferInsert>