import bcrypt from "bcrypt";
import { IPasswordHasher } from "@securepool/application";

export class BcryptHasher implements IPasswordHasher {
  private saltRounds: number;

  constructor(saltRounds: number = 12) {
    this.saltRounds = saltRounds;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
