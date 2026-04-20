import { UserTier } from "@prisma/client";

export function recalculateTier(tradeCount: number, reputationScore: number): UserTier {
  if (tradeCount >= 100 && reputationScore >= 4.5) return UserTier.DIAMOND;
  if (tradeCount >= 50  && reputationScore >= 4.0) return UserTier.GOLD;
  if (tradeCount >= 10  && reputationScore >= 3.5) return UserTier.SILVER;
  return UserTier.BRONZE;
}
