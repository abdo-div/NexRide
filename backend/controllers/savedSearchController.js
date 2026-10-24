import catchAsync from "../utils/catchAsync.js";
import * as savedSearchService from "../services/savedSearchService.js";

export const list = catchAsync(async (req, res) => {
  const searches = await savedSearchService.listSavedSearches(req.user.id);
  res.status(200).json({ status: "success", data: { searches } });
});
export const create = catchAsync(async (req, res) => {
  const search = await savedSearchService.createSavedSearch(req.user.id, req.body);
  res.status(201).json({ status: "success", data: { search } });
});
export const update = catchAsync(async (req, res) => {
  const search = await savedSearchService.updateSavedSearch(req.user.id, req.params.id, req.body);
  res.status(200).json({ status: "success", data: { search } });
});
export const remove = catchAsync(async (req, res) => {
  await savedSearchService.deleteSavedSearch(req.user.id, req.params.id);
  res.status(204).send();
});
