export type AuditLogActor = {
  id: string | null;
  email: string | null;
  fullName: string | null;
};

export type AuditLogListItem = {
  id: string;
  actor: AuditLogActor;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
};

export type AuditLogDetail = AuditLogListItem & {
  metadata: unknown | null;
};
