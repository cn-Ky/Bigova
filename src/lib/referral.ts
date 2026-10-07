export const REF_KEY = "bigova-ref";
export const REF_REWARD = 30;
export type ReferralInfo = { code: string; invited: number; earned: number; reward: number; limit: number };
export type RedeemResult = {
  status: "rewarded" | "already" | "none" | "invalid" | "self" | "limit" | "unverified";
  amount?: number;
  inviter?: string;
};
export const inviteLink = (origin: string, code: string) => `${origin}/giris?ref=${code}`;
