export class RefreshToken {
  constructor(
    public id: string,
    public userId: string,
    public tokenHash: string,
    public expiresAt: Date,
    public isRevoked: boolean,
  ) {}
}
