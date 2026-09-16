import APIFeatures from "../utils/APIFeatures.js";
import AppError from "../utils/appError.js";

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

export const getAll = (model) => async (queryString) => {
  const features = new APIFeatures(model.find(), queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const docs = await features.query;

  return {
    results: docs.length,
    data: docs,
  };
};
