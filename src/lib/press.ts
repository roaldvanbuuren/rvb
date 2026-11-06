export type PressType = 'Talk' | 'Podcast' | 'Interview' | 'Feature';

export interface PressEntry {
  /** Year and month, YYYY-MM. */
  date: string;
  outlet: string;
  title: string;
  type: PressType;
  /** Absent for entries that are no longer online. */
  url?: string;
}

/** Interviews, talks and podcasts that are online. Order here does not matter: the page sorts newest first. */
export const press: PressEntry[] = [
  { date: '2026-09', outlet: 'DLD Sports, Valencia', title: 'Community Is the Last Moat', type: 'Talk', url: 'https://dldnews.com/videos/community-is-the-last-moat-business-strategy-dld-sports/' },
  { date: '2026-06', outlet: 'The Four Horsemen', title: 'What Is The Future Of Esports?', type: 'Podcast', url: 'https://www.youtube.com/watch?v=BrF2sXCh2zs' },
  { date: '2025-07', outlet: 'MCV/Develop', title: 'ELO vs. ELO', type: 'Feature', url: 'https://content.yudu.com/web/69r/0A44aiu/MCV1003JuneJuly25/html/18.html' },
  { date: '2025-05', outlet: 'Esports Insider', title: 'Esports veterans on ELO and game marketing', type: 'Interview', url: 'https://esportsinsider.com/2025/05/esports-veterans-elo-game-marketing-interview' },
  { date: '2025-05', outlet: 'GamesBeat', title: 'ELO launches to remake game marketing', type: 'Feature', url: 'https://gamesbeat.com/elo-launches-to-remake-game-marketing-with-community-first-vision/' },
  { date: '2024-06', outlet: 'GMGames', title: 'From Call of Duty editor to ELO', type: 'Interview', url: 'https://gmgames.gg/exclusive-interview-with-roald-van-buuren-co-founder-of-esports-powerhouse-elo-agency-part-1' },
  { date: '2024-06', outlet: "All Chat Let's Talk", title: 'Fnatic, FACEIT and ELO', type: 'Podcast', url: 'https://www.linkedin.com/posts/linus-holmqvist-a96b84138_another-episode-of-all-chat-lets-talk-featuring-activity-7210919302302990336-y72W' },
  { date: '2024-04', outlet: 'Esports Insider', title: 'ELO Agency launch', type: 'Feature', url: 'https://esportsinsider.com/2024/04/elo-agency-launched-roald-van-buuren-jan-moerland' },
  { date: '2023-03', outlet: 'Confetti Industry Week, Nottingham', title: 'Running leagues and operations', type: 'Talk', url: 'https://www.gamespress.com/ADAM-SAVAGE-ALYSIA-JUDGE-FORMER-FACEIT-DIRECTOR-ROALD-VAN-BUUREN-AND-M' },
  { date: '2020-02', outlet: 'HLTV', title: 'From ECS to FLASHPOINT', type: 'Interview', url: 'https://www.hltv.org/news/29012/faceits-director-of-esports-we-made-a-lot-of-mistakes-with-ecs-the-biggest-one-was-that-sometimes-we-wanted-to-play-too-nice' },
];

/** No longer online: listed as plain text, no links. */
export const earlier: PressEntry[] = [
  { date: '2013-06', outlet: 'One World Sports', title: "FACEIT's growth through Quake Live and CS:GO", type: 'Interview' },
  { date: '2010-11', outlet: "Clark's Corner", title: 'Social networking in esports', type: 'Interview' },
  { date: '2009-06', outlet: 'Quake Live TV', title: 'A Fnatic PLAY competition', type: 'Interview' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(date: string): string {
  const [y, m] = date.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Newest first (stable for entries in the same month), grouped by year. */
export function groupByYear(entries: PressEntry[]): { year: string; items: PressEntry[] }[] {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const groups: { year: string; items: PressEntry[] }[] = [];
  for (const e of sorted) {
    const year = e.date.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(e);
    else groups.push({ year, items: [e] });
  }
  return groups;
}
