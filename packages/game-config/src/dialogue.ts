/**
 * Dialogue — docs/Molemisi LORE FINAL.txt §3 (Metsi a a Gopola) and §2 (Tsholofelo).
 *
 * Deep Time Lore ruling: every line here is POSITIVE. The Water Whisper only ever
 * gives (+1 Journal progress for listening) and Tsholofelo only ever observes or
 * gifts. Nothing in this file can take anything from the player, and none of it is
 * a level, an XP amount or a countdown (D5/C12).
 */

/** Doc 11 §3 — the chance the API rolls when the tank waters the farm. */
export const WATER_WHISPER_CHANCE = 0.1;

export interface WhisperLine {
  /**
   * Stable id stored on `lore_entries.slug`. Quotes may be reworded; this never
   * changes, so a player's listening history (and the is_original marker) survives.
   */
  slug: string;
  text: string;
}

/** The Water Whisper pool (Doc 11 §3 — ambient, fading, shown above the tank bar). */
export const WATER_WHISPERS: readonly WhisperLine[] = [
  {
    slug: 'water_whisper_rain_memory',
    text: 'The maize remembers the rain of last year. It grows quickly today.',
  },
  {
    slug: 'water_whisper_deep_roots',
    text: 'Deep roots drink from the memory of the river.',
  },
  {
    slug: 'water_whisper_seed_purpose',
    text: 'Water is only the message. The seed already knows its purpose.',
  },
  {
    slug: 'water_whisper_still_surface',
    text: 'For a moment the surface stands perfectly still, as if listening back.',
  },
  {
    slug: 'water_whisper_old_rains',
    text: 'Every drop carries an old rain. The soil knows them all by name.',
  },
  {
    slug: 'water_whisper_tank_hum',
    text: 'The tank hums a low note. Somewhere in the dark a pod splits open.',
  },
];

/**
 * Tsholofelo's speech-bubble pools (Doc 11 §2 — the companion bird).
 * She only speaks when the farm is already doing well; there is no scolding pool.
 *
 * The four Doc 11 example lines lead the idle pool verbatim; the extra lines
 * below are same-voice observations, never scolds.
 */
export const TSHOLOFELO_DIALOGUE: Record<'idle' | 'gift' | 'repair', readonly string[]> = {
  idle: [
    'The soil is thirsty, but patient. You are doing well.',
    'I found a shiny stone by the river today! The bush is happy.',
    'The water in the tank is cool and deep. It remembers the spring rains.',
    'Rest your hands for a moment. The crops know you are here.',
    'The wind is doing most of the work today.',
    'You watered everything. Even the stones look pleased.',
    'I will sit here, then. Someone has to supervise.',
  ],
  gift: [
    'I found this by the granary. It is yours now.',
    'A gift — for keeping the balance.',
    'For you. Do not ask where I got it.',
  ],
  repair: [
    'The wood is tired...',
    'That hinge has been complaining since morning.',
    'The fence post leans. It is not judgmental, but it leans.',
  ],
};

/**
 * R5 / docs-30 Pass 1 task 1.12 (docs-30 §6.1).
 *
 * The story review asked for a fourth ambient beat: market chatter that treats
 * LIVESTOCK as something valued rather than something converted to Pula. Three
 * of the four ambient voices in the game are implemented (Water Whisper,
 * Tsholofelo, the weather greeting); this is the missing one, and it is the only
 * livestock voice in the game that is not a transaction.
 *
 * Same rules as every other pool here (D5/C12): observations only — never an XP
 * amount, a level, a countdown, or a price quoted as a number.
 */
export const MARKET_WHISPERS: readonly WhisperLine[] = [
  {
    slug: 'market_whisper_kraal_warm',
    text: 'Your kraal was warm this morning. The animals carry that with them into town.',
  },
  {
    slug: 'market_whisper_name_them',
    text: 'An animal with a name is worth more than an animal with a number. The whole co-op knows it.',
  },
  {
    slug: 'market_whisper_no_rush',
    text: 'There is no rush. The milk will come, and the season will hold long enough for it.',
  },
  {
    slug: 'market_whisper_grandmothers_cows',
    text: 'My grandmother counted her wealth in cows and in rain. She was never poor.',
  },
];

