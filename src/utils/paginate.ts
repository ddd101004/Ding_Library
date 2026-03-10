export const paginate = (page: number | string, pageSize: number | string) => {
  page = +page;
  pageSize = +pageSize;

  if (pageSize > 100) {
    pageSize = 100;
  }
  if (+page < 1) {
    page = 1;
  }
  if (+pageSize < 1) {
    pageSize = 1;
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return {
    skip,
    take,
  };
};
