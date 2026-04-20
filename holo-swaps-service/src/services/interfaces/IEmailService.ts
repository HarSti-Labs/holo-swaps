export interface IEmailService {
  sendVerificationEmail(to: string, username: string, token: string): Promise<void>;
  sendPasswordResetEmail(to: string, username: string, token: string): Promise<void>;
}
