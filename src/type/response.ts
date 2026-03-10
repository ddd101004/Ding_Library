export type ResponseDataType<T> = {
  code: number;
  data: T;
  message: string;
};
