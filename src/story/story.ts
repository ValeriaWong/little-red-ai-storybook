/**
 * Little Red Riding Hood — story data (English adaptation of the v5 script).
 *
 * Source: `xiao-hong-mao-fen-zhi-gu-shi-xiu-ding-ban-v5.md` (Chinese, Grimm
 * "Little Red-Cap" 1812, public domain; this is an original adaptation).
 * Structure: 2 ending families x 2 = 4 endings. Branches B1 gift, B2 wolf,
 * B3 fork, B4 doorway, B5 doorstep. B4 is the experience switch, B5 the
 * final action. Determination (v5, the only rule): the ending follows what
 * actually happened this time — C2 (did she hear the wolf slip up at the
 * door) x R (was the big reveal shown during the questions) x H (how she
 * called for help: shout / bell). The C2 and R values are snapshotted the
 * first time the player chooses to call for help; what happens afterwards
 * never changes this run's ending.
 *
 * Images live in public/images/ (see scripts/prepare-images.py).
 */

export type Gift = 'flowers' | 'greeting';
export type HelpMethod = 'shout' | 'bell';
export type Route = 'bridge' | 'flowerbed';
export type CardId = 'ears' | 'eyes' | 'hands' | 'mouth';
export type EndingId = 'E-A1' | 'E-S1' | 'E-A2' | 'E-S2';

export interface StoryFlags {
  gift: Gift | null;
  /** W — did the wolf get the address from Red? (affects the show only) */
  toldWolf: boolean | null;
  route: Route | null;
  find: string | null;
  /** C2 — did she hear the wolf slip up at the door? */
  c2: 0 | 1 | null;
  /** R — was the big reveal actually shown? */
  r: 0 | 1;
  /** H — how she called for help. */
  help: HelpMethod | null;
  askedCards: CardId[];
  /** Snapshot of C2 and R taken the first time the player calls for help. */
  snapshot: { c2: 0 | 1 | null; r: 0 | 1 } | null;
  ending: EndingId | null;
}

export interface StoryState extends StoryFlags {
  node: string;
  /** Last question card asked (for the cards scene). */
  lastCard: CardId | null;
}

export const INITIAL_STATE: StoryState = {
  node: 'cover',
  gift: null,
  toldWolf: null,
  route: null,
  find: null,
  c2: null,
  r: 0,
  help: null,
  askedCards: [],
  snapshot: null,
  ending: null,
  lastCard: null,
};

export interface ChoiceOption {
  id: string;
  label: string;
  detail?: string;
  next: string;
  effect?: Partial<Pick<StoryFlags, 'gift' | 'toldWolf' | 'route' | 'find' | 'c2'>>;
}

export type StoryNode =
  | {
      kind: 'cover';
      id: 'cover';
      title: string;
      subtitle: string;
      image: string;
      startLabel: string;
    }
  | {
      kind: 'narration';
      id: string;
      title: string;
      image: string;
      imageAlt: string;
      lines: string[];
      next: string;
      nextLabel: string;
    }
  | {
      kind: 'choice';
      id: string;
      title: string;
      image: string;
      imageAlt: string;
      question: string;
      options: ChoiceOption[];
    }
  | {
      kind: 'cards';
      id: 'cards';
      title: string;
      image: string;
      imageAlt: string;
      intro: string;
    }
  | {
      kind: 'help';
      id: string;
      title: string;
      image: string;
      imageAlt: string;
      intro: string;
      /** Where the "call for help now" choice came from (for the snapshot). */
      from: 'heard' | 'unsure' | 'revealed';
    }
  | {
      kind: 'ending';
      id: string;
      ending: EndingId;
      title: string;
      image: string;
      imageAlt: string;
      uniqueMoment: string;
      lines: string[];
      next: string;
      nextLabel: string;
    }
  | {
      kind: 'recap';
      id: 'recap';
      title: string;
      image: string;
      imageAlt: string;
    };

export const CARDS: Record<
  CardId,
  { question: string; answer: string; action: string; image: string }
> = {
  ears: {
    question: 'Grandma, why are your ears so big?',
    answer: 'So I can hear you better, dear.',
    action: 'The wolf presses one ear down — but the other one pops right back up with a "boing!"',
    image: 'bed.jpg',
  },
  eyes: {
    question: 'Grandma, why are your glasses crooked?',
    answer: 'I... I always wear them like this.',
    action: 'The wolf hurries to fix his glasses, but the arm catches on the nightcap string and pulls the cap sideways.',
    image: 'glasses.jpg',
  },
  hands: {
    question: 'Grandma, why are your hands so furry?',
    answer: 'These are... my furry gloves!',
    action: 'The wolf pulls his hands under the blanket — but a little tuft of grey fur still pokes out of the sleeve.',
    image: 'bed.jpg',
  },
  mouth: {
    question: 'Grandma, why is your mouth so big?',
    answer: 'So I can speak... more... softly.',
    action: 'The wolf speaks softer and softer — and then his tummy suddenly rumbles "grrr!"',
    image: 'bed.jpg',
  },
};

export const CARD_ORDER: CardId[] = ['ears', 'eyes', 'hands', 'mouth'];

export const NODES: Record<string, StoryNode> = {
  cover: {
    kind: 'cover',
    id: 'cover',
    title: 'Little Red Riding Hood',
    subtitle:
      'A little forest path. Five little choices. A story about kindness, courage, and asking for help.',
    image: 'cottage.jpg',
    startLabel: 'Start the story',
  },

  kitchen: {
    kind: 'narration',
    id: 'kitchen',
    title: 'The cake',
    image: 'kitchen.jpg',
    imageAlt: 'Mum and Little Red Riding Hood at the table with the basket',
    lines: [
      'Mum lifts the cloth off the basket, and the smell of cake floats out.',
      'Little Red stands on tiptoe and sniffs. "It\'s Grandma\'s favourite cake!"',
      '"Grandma isn\'t feeling well today. She\'s resting at home," says Mum.',
      'Red hugs the basket tight. "When she smells it, she\'ll smile!"',
    ],
    next: 'gate',
    nextLabel: 'Walk to the gate',
  },

  gate: {
    kind: 'narration',
    id: 'gate',
    title: 'Meet the hunter',
    image: 'gate.jpg',
    imageAlt: 'The hunter with his tools at the garden gate',
    lines: [
      'Mum walks Red to the gate of their own garden. There they meet the hunter, carrying his tools. He often comes to mend Grandma\'s fence, and Red knows him.',
      '"I\'m going to Grandma\'s to mend her fence first," says the hunter. "When you get there, you can call me — or ring the little bell on her gate."',
      'Mum tucks a little map into the basket. "Follow the road we know. If something feels wrong, ask one of the grown-ups we agreed on."',
      'Red waves goodbye, and the hunter waves back. Off she goes, basket in hand.',
    ],
    next: 'b1',
    nextLabel: 'Set off down the road',
  },

  b1: {
    kind: 'choice',
    id: 'b1',
    title: 'A little surprise',
    image: 'flowers.jpg',
    imageAlt: 'Daisies nodding in the wind beside the path',
    question: 'Besides the cake, I want to give Grandma a little surprise. A small bunch of flowers, or a sweet hello?',
    options: [
      {
        id: 'flowers',
        label: 'Pick three daisies',
        detail: 'Tap three daisies. Each one goes into the basket — "One, two, three!"',
        next: 'b2',
        effect: { gift: 'flowers' },
      },
      {
        id: 'greeting',
        label: 'Practise a sweet hello',
        detail: '"Grandma, I\'m here to keep you company!" You can say it along with her.',
        next: 'b2',
        effect: { gift: 'greeting' },
      },
    ],
  },

  b2: {
    kind: 'choice',
    id: 'b2',
    title: 'The wolf\'s question',
    image: 'wolf.jpg',
    imageAlt: 'The big grey wolf steps out from behind the tree',
    question:
      'Behind a big tree steps a big grey wolf. He sidles up, smiling. His nose twitches toward the basket — "Grrr..." His tummy rumbles! He quickly pats the tree trunk. "That was the tree talking." Red looks at the quiet tree. "Something in your basket smells so good. Who is it for? Where are you taking it?" He smells the cake. He wants that cake. What will Red answer?',
    options: [
      {
        id: 'tell',
        label: 'Tell him',
        detail: '"It\'s a cake for Grandma. I\'m going to Grandma\'s house — the little wooden house with the red roof, just up ahead."',
        next: 'b3',
        effect: { toldWolf: true },
      },
      {
        id: 'secret',
        label: 'Keep it secret',
        detail: '"Where Grandma lives, I\'m not telling you. I\'m going on my way."',
        next: 'b3',
        effect: { toldWolf: false },
      },
    ],
  },

  b3: {
    kind: 'choice',
    id: 'b3',
    title: 'Two roads',
    image: 'fork.jpg',
    imageAlt: 'The path splits in two, with signposts and a little map',
    question:
      'The main road bends around a little hill and splits into two familiar paths. One crosses a little bridge, the other winds past the flower beds. Both have signposts to Grandma\'s house. Red opens her map. "Both roads lead to Grandma\'s. Which way shall we go?"',
    options: [
      {
        id: 'bridge',
        label: 'Take the bridge road',
        detail: 'In the mud there is a row of little bird footprints — and a few much bigger ones.',
        next: 'bridge',
        effect: { route: 'bridge', find: 'the big footprints in the mud' },
      },
      {
        id: 'flowerbed',
        label: 'Take the flower-bed road',
        detail: 'A rustling comes from behind the flowers, and something grey hangs on a branch.',
        next: 'flowerbed',
        effect: { route: 'flowerbed', find: 'the tuft of grey fur on the branch' },
      },
    ],
  },

  bridge: {
    kind: 'narration',
    id: 'bridge',
    title: 'Strange footprints',
    image: 'bridge.jpg',
    imageAlt: 'A little wooden bridge over a stream, with footprints in the mud',
    lines: [
      'There are some strange prints in the mud. Can you see them?',
      'Look — the big print is not a bird\'s. Someone just walked this way, toward Grandma\'s house.',
    ],
    next: 'interlude',
    nextLabel: 'Keep walking',
  },

  flowerbed: {
    kind: 'narration',
    id: 'flowerbed',
    title: 'Something grey',
    image: 'fork.jpg',
    imageAlt: 'Flower beds along the path, with a grey tuft caught on a branch',
    lines: [
      'What\'s moving behind the flowers? Can you see it?',
      'A little tuft of grey fur, caught on a branch. Who left it behind as they passed?',
    ],
    next: 'interlude',
    nextLabel: 'Keep walking',
  },

  interlude: {
    kind: 'narration',
    id: 'interlude',
    title: 'Meanwhile, at Grandma\'s house...',
    image: 'wolf-bed.jpg',
    imageAlt: 'The wolf puts on Grandma\'s nightcap and climbs under the blanket',
    lines: [
      'While Red is still on the road, something has already happened at Grandma\'s house.',
      'Before Red arrives, Grandma notices the wolf quietly pushing the door open. She steps back into the inner room and closes the door. She is safe — and she stays safe.',
      'The wolf doesn\'t find Grandma. But he sees the nightcap by the bed. "I\'ve got an idea!" He puts on the nightcap and climbs under the blanket.',
      'Red reaches Grandma\'s gate and sees the little bell by the door. Down the stone path, the front door stands open.',
    ],
    next: 'b4',
    nextLabel: 'Walk up the stone path',
  },

  b4: {
    kind: 'choice',
    id: 'b4',
    title: 'At the door',
    image: 'door.jpg',
    imageAlt: 'Red stops at the threshold; inside, the blanket on the bed bulges strangely',
    question:
      'Red walks up the stone path and stops at the threshold. She does not go in. "Little Red, what shall we do? Let\'s stay right here. Shall we listen — or call Grandma?"',
    options: [
      {
        id: 'listen',
        label: 'Stop and listen',
        detail: 'Stay outside the door and listen to what\'s inside.',
        next: 'b5-heard',
        effect: { c2: 1 },
      },
      {
        id: 'call',
        label: 'Call "Grandma, I\'m here!"',
        detail: 'Stand at the door and call out to Grandma.',
        next: 'b5-unsure',
        effect: { c2: 0 },
      },
    ],
  },

  'b5-heard': {
    kind: 'help',
    id: 'b5-heard',
    from: 'heard',
    title: 'It\'s the wolf!',
    image: 'door.jpg',
    imageAlt: 'Red steps back from the door — she heard the wolf give himself away',
    intro:
      'Red stops outside the door. From inside comes a muttering: "Ears hidden, tail hidden... hee hee, she\'ll think I\'m Grandma for sure!" Red\'s eyes go wide. "That\'s the wolf from before, pretending to be Grandma!" The wolf gave himself away. Red knows: the one in the bed is not Grandma. She already knows it\'s the wolf, so there is no need to ask more questions. Two ways to call for help:',
  },

  'b5-unsure': {
    kind: 'choice',
    id: 'b5-unsure',
    title: 'Something feels strange',
    image: 'door.jpg',
    imageAlt: 'Red stands at the door; the blanket on the bed bulges strangely',
    question:
      'Red stands at the door. "Grandma, I\'m here!" From under the blanket comes an answer: "Come in—" Red doesn\'t step forward. She looks at the lumpy blanket. Something feels strange. What shall she do?',
    options: [
      {
        id: 'look',
        label: 'Look closer',
        detail: 'Ask questions and look for what\'s different.',
        next: 'cards',
      },
      {
        id: 'help-now',
        label: 'Call for help now',
        detail: 'Step back and call the hunter right away.',
        next: 'help-now',
      },
    ],
  },

  cards: {
    kind: 'cards',
    id: 'cards',
    title: 'What looks different?',
    image: 'bed.jpg',
    imageAlt: 'The figure in the bed, with the blanket pulled up high',
    intro:
      'Four question cards: ears, eyes, hands, mouth. Each one has its own answer — and the picture changes when you ask. You can look at up to two different cards before calling for help. You can also stop after the first one, or call for help right away. Listening to the same card again doesn\'t count.',
  },

  revealed: {
    kind: 'help',
    id: 'revealed',
    from: 'revealed',
    title: 'It\'s you!',
    image: 'reveal.jpg',
    imageAlt: 'Two grey ears pop straight up and a tail pokes out from under the blanket',
    intro:
      'The wolf gets more and more flustered, and the nightcap slips off — the big reveal! Two grey ears pop straight up, and a tail pokes out from under the blanket. Red steps back outside the door: "It\'s you!" Now call for help:',
  },

  'help-now': {
    kind: 'help',
    id: 'help-now',
    from: 'unsure',
    title: 'Call for help',
    image: 'help.jpg',
    imageAlt: 'Red walks back to the gate, where the hunter is waiting',
    intro:
      'Red steps back from the threshold and walks along the stone path to the gate. How will she call the hunter?',
  },

  'ending-a1': {
    kind: 'ending',
    id: 'ending-a1',
    ending: 'E-A1',
    title: 'I heard you!',
    image: 'help.jpg',
    imageAlt: 'The hunter hurries to the gate',
    uniqueMoment:
      'Red says loudly: "I heard it all — he said to hide his ears and hide his tail!" Hearing Red repeat his plan, the wolf\'s ears droop. "You... you heard all of that?"',
    lines: [
      'From behind the fence comes the answer at once: "I hear you — I\'m coming!" The hunter arrives at the gate.',
      'Red points at the door. "The wolf is in there, pretending to be Grandma." He listens, then walks with her along the stone path to the front door.',
      'The hunter stands at the door with Red and calls inside: "We\'re all here, Grandma." Grandma opens the inner door and comes out.',
      'The wolf scrambles out of bed wearing two different slippers. One step — "flap"; another step — "squeak". He looks down and quickly puts the slippers back by the door.',
      'The hunter says: "If you want something to eat, you can ask. You can\'t sneak into someone\'s home, and you can\'t take other people\'s things." The wolf hangs his head and walks back to the forest.',
    ],
    next: 'reunion',
    nextLabel: 'Back to Grandma',
  },

  'ending-s1': {
    kind: 'ending',
    id: 'ending-s1',
    ending: 'E-S1',
    title: 'Ding-a-ling, help is here!',
    image: 'help.jpg',
    imageAlt: 'The hunter hurries to the gate as the bell rings',
    uniqueMoment:
      'When the bell rings and the hunter answers, the wolf\'s fake snoring stops. He listens hard, ears up — and his disguise looks even more obvious.',
    lines: [
      'From behind the fence comes the answer at once: "I hear you — I\'m coming!" The hunter arrives at the gate.',
      'Red points at the door. "The wolf is in there, pretending to be Grandma." He listens, then walks with her along the stone path to the front door.',
      'The hunter stands at the door with Red and calls inside: "We\'re all here, Grandma." Grandma opens the inner door and comes out.',
      'The wolf scrambles out of bed wearing two different slippers. One step — "flap"; another step — "squeak". He looks down and quickly puts the slippers back by the door.',
      'The hunter says: "If you want something to eat, you can ask. You can\'t sneak into someone\'s home, and you can\'t take other people\'s things." The wolf hangs his head and walks back to the forest.',
    ],
    next: 'reunion',
    nextLabel: 'Back to Grandma',
  },

  'ending-a2': {
    kind: 'ending',
    id: 'ending-a2',
    ending: 'E-A2',
    title: 'It\'s you!',
    image: 'reveal.jpg',
    imageAlt: 'The nightcap has fallen beside the pillow; the wolf covers his ears',
    uniqueMoment:
      'The nightcap falls beside the pillow. The wolf quickly covers his ears with both paws — but his tail pops up again from under the blanket.',
    lines: [
      'From behind the fence comes the answer at once: "I hear you — I\'m coming!" The hunter arrives at the gate.',
      'Red points at the door. "The wolf is in there pretending to be Grandma — I saw it all!" He listens, then walks with her along the stone path to the front door.',
      'The hunter stands at the door with Red and calls inside: "We\'re all here, Grandma." Grandma opens the inner door and comes out.',
      'The wolf scrambles out of bed wearing two different slippers. One step — "flap"; another step — "squeak". He looks down and quickly puts the slippers back by the door.',
      'The hunter says: "If you want something to eat, you can ask. You can\'t sneak into someone\'s home, and you can\'t take other people\'s things." The wolf hangs his head and walks back to the forest.',
    ],
    next: 'reunion',
    nextLabel: 'Back to Grandma',
  },

  'ending-s2': {
    kind: 'ending',
    id: 'ending-s2',
    ending: 'E-S2',
    title: "Let's look together",
    image: 'walk.jpg',
    imageAlt: 'The hunter walks with Red along the stone path to the front door',
    uniqueMoment:
      'Red says: "It looks very strange inside. Will you come and look with me?" The hunter says: "Of course. Let\'s look together."',
    lines: [
      'From behind the fence comes the answer at once: "I hear you — I\'m coming!" The hunter arrives at the gate.',
      'The hunter walks with her along the stone path to the front door, and they stand outside together.',
      'The hunter stands at the door with Red and calls inside: "We\'re all here, Grandma." Grandma opens the inner door and comes out — and glances at the bed: "That\'s my nightcap — but those aren\'t my ears!"',
      'The wolf scrambles out of bed wearing two different slippers. One step — "flap"; another step — "squeak". He looks down and quickly puts the slippers back by the door.',
      'The hunter says: "If you want something to eat, you can ask. You can\'t sneak into someone\'s home, and you can\'t take other people\'s things." The wolf hangs his head and walks back to the forest.',
    ],
    next: 'reunion',
    nextLabel: 'Back to Grandma',
  },

  reunion: {
    kind: 'narration',
    id: 'reunion',
    title: 'Home at last',
    image: 'reunion.jpg',
    imageAlt: 'Grandma takes Little Red Riding Hood\'s hand',
    lines: [
      'Grandma takes Red\'s hand. "Thank you for telling us what happened."',
      'Red puts the basket on the table. The cloth moves gently. Tap the cloth, and Red lifts it: "Grandma, smell!"',
      'Grandma sniffs and smiles. "Mmm, that\'s our favourite smell. I\'m even happier now that you\'re here."',
      '"When you\'re not sure, you can ask a grown-up for help."',
    ],
    next: 'recap',
    nextLabel: 'See today\'s little adventure',
  },

  recap: {
    kind: 'recap',
    id: 'recap',
    title: "Today's little adventure",
    image: 'finale.jpg',
    imageAlt: 'Everyone together at Grandma\'s table, cake and flowers on the table',
  },
};

/** Wolf's show-only behaviour, from B2 (W does not affect the ending). */
export function wolfNote(state: StoryState): string | null {
  if (state.toldWolf === true) {
    return 'The wolf knew the way, so he got to Grandma\'s house early — and his disguise was neat and tidy.';
  }
  if (state.toldWolf === false) {
    return 'The wolf didn\'t get the address, so he had to hurry — his nightcap was crooked and the blanket wasn\'t tucked in.';
  }
  return null;
}

/** v5 determination table: C2 x R x H -> ending. */
export function determineEnding(
  c2: 0 | 1 | null,
  r: 0 | 1,
  help: HelpMethod,
): EndingId {
  if (c2 === 1) return help === 'shout' ? 'E-A1' : 'E-S1';
  if (r === 1) return 'E-A2';
  return 'E-S2';
}

export const ENDING_TITLES: Record<EndingId, string> = {
  'E-A1': 'I heard you!',
  'E-S1': 'Ding-a-ling, help is here!',
  'E-A2': "It's you!",
  'E-S2': "Let's look together",
};

export const ENDING_NODE: Record<EndingId, string> = {
  'E-A1': 'ending-a1',
  'E-S1': 'ending-s1',
  'E-A2': 'ending-a2',
  'E-S2': 'ending-s2',
};
