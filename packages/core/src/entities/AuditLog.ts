export class AuditLog {
  constructor(
    public id: string,
    public userId: string,
    public tenantId: string,
    public action: string,
    public ip: string,
    public metadata: Record<string, unknown>,
    public timestamp: Date,
  ) {}
}
