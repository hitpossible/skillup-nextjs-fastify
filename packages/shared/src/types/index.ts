export interface PaginationQuery {
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    field: string | null;
    requestId: string;
  };
}

// ใช้สำหรับ sign — ไม่มี iat/exp (JWT library เติมให้)
export interface JwtSignPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  type?: "access" | "refresh";
}

// ใช้สำหรับ verify — มี iat/exp ครบ
export interface JwtPayload extends JwtSignPayload {
  iat: number;
  exp: number;
}
