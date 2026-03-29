export interface AdminRdv {
  id: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  proposedSlotStart: string | null;
  proposedSlotEnd: string | null;
  client: { name: string | null; email: string | null; phone: string | null } | null;
  guestName: string | null;
  guestPhone: string | null;
}
