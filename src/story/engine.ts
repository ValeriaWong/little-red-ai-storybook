/**
 * Story engine — a small state machine over the v5 branch graph.
 *
 * Rules enforced here (from the v5 script):
 * - Before calling for help, at most TWO different question cards may be
 *   observed. Re-asking the same card does not count. Asking a second
 *   different card plays the big reveal (R = 1).
 * - The first time the player chooses to call for help, the current C2 and R
 *   are snapshotted. What happens afterwards never changes this run's ending.
 * - Ending = determineEnding(snapshot.c2, snapshot.r, H).
 */
import {
  CARDS,
  CARD_ORDER,
  determineEnding,
  ENDING_NODE,
  INITIAL_STATE,
  NODES,
  type CardId,
  type HelpMethod,
  type StoryNode,
  type StoryState,
} from './story';

export type Action =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'choose'; optionId: string }
  | { type: 'askCard'; card: CardId }
  | { type: 'callHelp' }
  | { type: 'helpMethod'; method: HelpMethod }
  | { type: 'replay' }
  | { type: 'replayFromFork' };

export function getNode(state: StoryState): StoryNode {
  return NODES[state.node];
}

/** Cards the player may still ask (not yet asked, max 2 distinct). */
export function availableCards(state: StoryState): CardId[] {
  if (state.askedCards.length >= 2) return [];
  return CARD_ORDER.filter((c) => !state.askedCards.includes(c));
}

/** Human-readable recap of what really happened this run. */
export function recapLines(state: StoryState): string[] {
  const lines: string[] = [];
  if (state.gift === 'flowers') {
    lines.push('The gift I brought: three daisies, picked one by one.');
  } else if (state.gift === 'greeting') {
    lines.push('The gift I brought: a sweet hello — "Grandma, I\'m here to keep you company!"');
  }
  if (state.find) {
    lines.push(`What I discovered on the road: ${state.find}.`);
  }
  if (state.c2 === 1) {
    lines.push('What I heard at the door: the wolf muttering his own plan.');
  } else if (state.c2 === 0 && state.r === 1) {
    lines.push('What I discovered at the door: the nightcap slipped off and the grey ears popped up.');
  } else if (state.c2 === 0) {
    lines.push('What I noticed at the door: the blanket looked lumpy and strange.');
  }
  if (state.help === 'shout') {
    lines.push('How I called for help: I shouted for the hunter.');
  } else if (state.help === 'bell') {
    lines.push('How I called for help: I rang the little bell on the gate.');
  }
  return lines;
}

function snapshot(state: StoryState): StoryState {
  if (state.snapshot) return state;
  return { ...state, snapshot: { c2: state.c2, r: state.r } };
}

export function reduce(state: StoryState, action: Action): StoryState {
  const node = NODES[state.node];

  switch (action.type) {
    case 'start':
      return { ...INITIAL_STATE, node: 'kitchen' };

    case 'replay':
      return { ...INITIAL_STATE };

    case 'replayFromFork': {
      // v5: "Want to see what's on the other road?" — restart from B3,
      // keeping the gift and what the wolf learned; C2/R/H reset.
      return {
        ...state,
        node: 'b3',
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
    }

    case 'next': {
      if (node.kind === 'narration') {
        return { ...state, node: node.next };
      }
      if (node.kind === 'ending') {
        return { ...state, node: node.next };
      }
      return state;
    }

    case 'choose': {
      if (node.kind !== 'choice') return state;
      const opt = node.options.find((o) => o.id === action.optionId);
      if (!opt) return state;
      return { ...state, ...(opt.effect ?? {}), node: opt.next };
    }

    case 'askCard': {
      if (node.kind !== 'cards') return state;
      if (state.askedCards.includes(action.card)) {
        // Re-listening to the same card: show it again, no count change.
        return { ...state, lastCard: action.card };
      }
      if (state.askedCards.length >= 2) return state;
      const asked = [...state.askedCards, action.card];
      // Second different card -> the big reveal plays (R = 1).
      if (asked.length === 2) {
        return { ...state, askedCards: asked, lastCard: action.card, r: 1, node: 'revealed' };
      }
      return { ...state, askedCards: asked, lastCard: action.card };
    }

    case 'callHelp': {
      // First time calling for help: snapshot C2 and R now.
      if (node.kind === 'cards' || node.id === 'b5-unsure') {
        return { ...snapshot(state), node: 'help-now' };
      }
      return state;
    }

    case 'helpMethod': {
      if (node.kind !== 'help') return state;
      const snap = state.snapshot ?? { c2: state.c2, r: state.r };
      const ending = determineEnding(snap.c2, snap.r, action.method);
      return {
        ...state,
        snapshot: snap,
        help: action.method,
        ending,
        node: ENDING_NODE[ending],
      };
    }

    default:
      return state;
  }
}

/** Cards the player has already asked about, with their Q&A. */
export function askedCardDetails(state: StoryState) {
  return state.askedCards.map((id) => ({ id, ...CARDS[id] }));
}
