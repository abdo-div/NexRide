export interface CustomerMessage {
  id: string;
  senderRole: "CUSTOMER" | "AGENT" | "SYSTEM";
  senderName: string;
  body: string;
  kind: "TEXT" | "SYSTEM";
  createdAt: string | null;
}

export interface CustomerConversation {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED" | "ARCHIVED";
  unreadForCustomer: number;
  lastMessage: { preview: string; at: string | null; sender: string };
  company: {
    id: string | null;
    name: string;
    logo: string | null;
    phone: string | null;
    city: string | null;
  };
  booking: {
    id: string;
    status: string;
    pickupLocation: string | null;
    startDate: string | null;
    endDate: string | null;
    vehicle: {
      make: string;
      model: string;
      year: number;
      photo: string | null;
    } | null;
  } | null;
}

export interface CustomerConversationThread {
  conversation: CustomerConversation;
  messages: CustomerMessage[];
}

