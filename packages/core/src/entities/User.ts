export class User {
  constructor(
    public id: string,
    public tenantId: string,
    public email: string,
    public passwordHash: string | null,
    public isVerified: boolean,
    public createdAt: Date,
  ) {}
}
