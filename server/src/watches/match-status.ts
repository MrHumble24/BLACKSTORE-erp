import { MatchStatus } from '@prisma/client';

/** Allowed match status moves (F34 contract, BR-9). BOUGHT is final; IGNORED can be reopened. */
export const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  [MatchStatus.NEW]: [MatchStatus.SEEN, MatchStatus.CONTACTED, MatchStatus.IGNORED],
  [MatchStatus.SEEN]: [MatchStatus.CONTACTED, MatchStatus.IGNORED],
  [MatchStatus.CONTACTED]: [MatchStatus.BOUGHT, MatchStatus.IGNORED],
  [MatchStatus.BOUGHT]: [],
  [MatchStatus.IGNORED]: [MatchStatus.NEW],
};
