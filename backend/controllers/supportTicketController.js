import catchAsync from "../utils/catchAsync.js";
import * as support from "../services/supportTicketService.js";

export const createTicket = catchAsync(async (req, res) => {
  const ticket = await support.createBookingTicket(req.user.id, req.body);
  res.status(201).json({ status: "success", data: { ticket } });
});

export const bookingTickets = catchAsync(async (req, res) => {
  const tickets = await support.getBookingTickets(req.user.id, req.params.bookingId);
  res.status(200).json({ status: "success", results: tickets.length, data: { tickets } });
});

export const staffTickets = catchAsync(async (req, res) => {
  const tickets = await support.listStaffTickets(req.user, req.tenantId, req.query);
  res.status(200).json({ status: "success", results: tickets.length, data: { tickets } });
});

export const addMessage = catchAsync(async (req, res) => {
  const ticket = await support.addTicketMessage(
    req.params.id,
    req.user,
    req.tenantId,
    req.body.message,
  );
  res.status(200).json({ status: "success", data: { ticket } });
});

export const updateStatus = catchAsync(async (req, res) => {
  const ticket = await support.updateTicketStatus(
    req.params.id,
    req.user,
    req.tenantId,
    req.body.status,
  );
  res.status(200).json({ status: "success", data: { ticket } });
});
