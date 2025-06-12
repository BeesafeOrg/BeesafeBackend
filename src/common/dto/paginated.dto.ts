export class PaginatedDto<T, M = {}> {
  results: T[];
  page: number;
  size: number;
  total: number;
  meta?: M;
}
