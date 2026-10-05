import AppError from "../utils/appError.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";

export const deleteOne = (model) => async (id) => {
  const doc = await model.findByIdAndDelete(id);

  if (!doc) {
    throw new AppError("no document found with that ID", 404);
  }
  return null;
};

export const updateOne = (model) => async (id, data) => {
  const doc = await model.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!doc) {
    throw new AppError("no document found with that ID", 404);
  }
  return doc;
};

export const createOne = (model) => async (data) => {
  const doc = await model.create(data);
  return doc;
};

export const getOne = (model, popOptions) => async (id) => {
  let query = model.findById(id);
  if (popOptions) query = query.populate(popOptions);
  const doc = await query;

  if (!doc) {
    throw new AppError("no document found with that ID", 404);
  }
  return doc;
};

export const getAll = (model, searchFields = []) => async (queryString) => {
  const { docs, pagination } = await runPaginatedQuery(
    model,
    {},
    queryString,
    { searchFields },
  );

  return {
    results: docs.length,
    data: docs,
    pagination,
  };
};
