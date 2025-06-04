export class PaginatedDto<TData> {
  results: TData[];
  page: number;
  size: number;
  total: number;
}