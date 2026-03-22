export interface IAuthPlugin {
  name: string;
  execute(data: unknown): Promise<unknown>;
}
