import { api } from "./client";
import { ApiResponse } from "@/types";

export interface SupportTicketPayload {
  email: string;
  category: string;
  urgency: string;
  subject: string;
  description: string;
  tradeCode?: string | null;
  userAgent?: string | null;
}

export interface SupportTicketSummary {
  id: string;
  ticketNumber: string;
  category: string;
  urgency: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  tradeCode: string | null;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  body: string;
  isAdminReply: boolean;
  createdAt: string;
  author: { username: string; avatarUrl: string | null } | null;
}

export interface TicketDetail extends SupportTicketSummary {
  email: string;
  description: string;
  category: string;
  urgency: string;
  userAgent: string | null;
  user: { username: string } | null;
  messages: TicketMessage[];
}

export interface AdminTicketRow extends SupportTicketSummary {
  email: string;
  user: { username: string } | null;
  messages: { id: string }[];
}

export const supportApi = {
  submit: async (data: SupportTicketPayload): Promise<{ ticketNumber: string }> => {
    const res = await api.post<ApiResponse<{ ticketNumber: string }>>("/support", data);
    return res.data.data!;
  },

  getMyTickets: async (): Promise<SupportTicketSummary[]> => {
    const res = await api.get<ApiResponse<SupportTicketSummary[]>>("/support/my");
    return res.data.data!;
  },

  getTicket: async (ticketNumber: string): Promise<TicketDetail> => {
    const res = await api.get<ApiResponse<TicketDetail>>(`/support/ticket/${ticketNumber}`);
    return res.data.data!;
  },

  postMessage: async (ticketNumber: string, body: string): Promise<TicketMessage> => {
    const res = await api.post<ApiResponse<TicketMessage>>(`/support/ticket/${ticketNumber}/messages`, { body });
    return res.data.data!;
  },

  updateStatus: async (ticketNumber: string, status: string): Promise<void> => {
    await api.patch(`/support/ticket/${ticketNumber}/status`, { status });
  },

  getAdminTickets: async (params?: {
    status?: string; urgency?: string; category?: string; page?: number;
  }): Promise<{ tickets: AdminTicketRow[]; total: number; totalPages: number; page: number }> => {
    const res = await api.get<ApiResponse<{ tickets: AdminTicketRow[]; total: number; totalPages: number; page: number }>>(
      "/admin/support",
      { params }
    );
    return res.data.data!;
  },
};
