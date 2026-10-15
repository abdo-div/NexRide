import catchAsync from "../utils/catchAsync.js";
import {
  getCustomerConversationThread,
  listCustomerConversations,
  sendCustomerMessage,
} from "../services/customerMessagesService.js";

export const getMyConversations = catchAsync(async (req, res) => {
  const data = await listCustomerConversations(req.user._id || req.user.id);
  res.status(200).json({ status: "success", data });
});

export const getMyConversationThread = catchAsync(async (req, res) => {
  const data = await getCustomerConversationThread({
    customerId: req.user._id || req.user.id,
    conversationId: req.params.id,
  });
  res.status(200).json({ status: "success", data });
});

export const postMyConversationMessage = catchAsync(async (req, res) => {
  const message = await sendCustomerMessage({
    customerId: req.user._id || req.user.id,
    conversationId: req.params.id,
    body: req.body.body,
    customerName: req.user.name,
  });
  res.status(201).json({ status: "success", data: { message } });
});
