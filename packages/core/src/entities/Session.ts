export class Session {
  constructor(
    public id: string,
    public userId: string,
    public device: string,
    public ip: string,
    public createdAt: Date,
    public isActive: boolean,
  ) {}
}
