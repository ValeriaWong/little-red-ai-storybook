/**
 * Tests for the v5 story engine: all four endings, the two-card limit,
 * the help snapshot rule, and replay from the fork.
 *
 * Run: npm test
 */
import { describe, expect, it } from 'vitest';
import { availableCards, recapLines, reduce } from './engine';
import { determineEnding, INITIAL_STATE, type StoryState } from './story';

function play(actions: Array<Parameters<typeof reduce>[1]>): StoryState {
  return actions.reduce((s, a) => reduce(s, a), INITIAL_STATE);
}

/** Walk the common path to B4 (kitchen -> gate -> B1 flowers -> B2 secret -> B3 bridge -> interlude). */
function toB4(): StoryState {
  return play([
    { type: 'start' },
    { type: 'next' }, // kitchen -> gate
    { type: 'next' }, // gate -> b1
    { type: 'choose', optionId: 'flowers' }, // b1 -> b2
    { type: 'choose', optionId: 'secret' }, // b2 -> b3
    { type: 'choose', optionId: 'bridge' }, // b3 -> bridge
    { type: 'next' }, // bridge -> interlude
    { type: 'next' }, // interlude -> b4
  ]);
}

describe('determineEnding (v5 table: C2 x R x H)', () => {
  it('C2=1 + shout -> E-A1', () => expect(determineEnding(1, 0, 'shout')).toBe('E-A1'));
  it('C2=1 + bell -> E-S1', () => expect(determineEnding(1, 0, 'bell')).toBe('E-S1'));
  it('C2=0, R=1 + either -> E-A2', () => {
    expect(determineEnding(0, 1, 'shout')).toBe('E-A2');
    expect(determineEnding(0, 1, 'bell')).toBe('E-A2');
  });
  it('C2=0, R=0 + either -> E-S2', () => {
    expect(determineEnding(0, 0, 'shout')).toBe('E-S2');
    expect(determineEnding(0, 0, 'bell')).toBe('E-S2');
  });
});

describe('full runs', () => {
  it('E-A1: listen at the door, then shout', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'listen' }, // b4 -> b5-heard (C2=1)
      { type: 'helpMethod', method: 'shout' },
    ]);
    expect(s.ending).toBe('E-A1');
    expect(s.node).toBe('ending-a1');
  });

  it('E-S1: listen at the door, then ring the bell', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'listen' },
      { type: 'helpMethod', method: 'bell' },
    ]);
    expect(s.ending).toBe('E-S1');
    expect(s.node).toBe('ending-s1');
  });

  it('E-A2: call at the door, ask two cards (reveal), then shout', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'call' }, // b4 -> b5-unsure (C2=0)
      { type: 'choose', optionId: 'look' }, // -> cards
      { type: 'askCard', card: 'ears' },
      { type: 'askCard', card: 'eyes' }, // second card -> reveal, R=1
      { type: 'helpMethod', method: 'shout' },
    ]);
    expect(s.r).toBe(1);
    expect(s.ending).toBe('E-A2');
    expect(s.node).toBe('ending-a2');
  });

  it('E-S2: call at the door, ask one card, then call for help and ring the bell', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'call' },
      { type: 'choose', optionId: 'look' },
      { type: 'askCard', card: 'mouth' },
      { type: 'callHelp' }, // snapshot C2=0, R=0
      { type: 'helpMethod', method: 'bell' },
    ]);
    expect(s.r).toBe(0);
    expect(s.ending).toBe('E-S2');
    expect(s.node).toBe('ending-s2');
  });

  it('E-S2: call at the door and ask for help at once (no cards)', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'call' },
      { type: 'choose', optionId: 'help-now' },
      { type: 'helpMethod', method: 'shout' },
    ]);
    expect(s.ending).toBe('E-S2');
  });
});

function toB4Actions(): Array<Parameters<typeof reduce>[1]> {
  return [
    { type: 'start' },
    { type: 'next' },
    { type: 'next' },
    { type: 'choose', optionId: 'flowers' },
    { type: 'choose', optionId: 'secret' },
    { type: 'choose', optionId: 'bridge' },
    { type: 'next' },
    { type: 'next' },
  ];
}

describe('question cards', () => {
  function toCards(): StoryState {
    return play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'call' },
      { type: 'choose', optionId: 'look' },
    ]);
  }

  it('re-asking the same card does not count', () => {
    let s = toCards();
    s = reduce(s, { type: 'askCard', card: 'ears' });
    s = reduce(s, { type: 'askCard', card: 'ears' });
    expect(s.askedCards).toEqual(['ears']);
    expect(availableCards(s)).toEqual(['eyes', 'hands', 'mouth']);
  });

  it('no third card after two distinct cards (second card reveals)', () => {
    let s = toCards();
    s = reduce(s, { type: 'askCard', card: 'ears' });
    s = reduce(s, { type: 'askCard', card: 'hands' });
    expect(s.r).toBe(1);
    expect(s.node).toBe('revealed');
    expect(availableCards(s)).toEqual([]);
  });

  it('snapshot: help chosen after one card keeps R=0 even though the reveal would have come next', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'call' },
      { type: 'choose', optionId: 'look' },
      { type: 'askCard', card: 'ears' },
      { type: 'callHelp' },
      { type: 'helpMethod', method: 'shout' },
    ]);
    expect(s.snapshot).toEqual({ c2: 0, r: 0 });
    expect(s.ending).toBe('E-S2');
  });
});

describe('replay', () => {
  it('replay from the fork keeps the gift and the wolf fact, resets C2/R/H', () => {
    let s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'listen' },
      { type: 'helpMethod', method: 'shout' },
    ]);
    expect(s.ending).toBe('E-A1');
    s = reduce(s, { type: 'replayFromFork' });
    expect(s.node).toBe('b3');
    expect(s.gift).toBe('flowers');
    expect(s.toldWolf).toBe(false);
    expect(s.c2).toBeNull();
    expect(s.r).toBe(0);
    expect(s.help).toBeNull();
    expect(s.ending).toBeNull();
  });

  it('full replay resets everything', () => {
    let s = toB4();
    s = reduce(s, { type: 'replay' });
    expect(s).toEqual(INITIAL_STATE);
  });

  it('recap only lists what really happened', () => {
    const s = play([
      ...toB4Actions(),
      { type: 'choose', optionId: 'listen' },
      { type: 'helpMethod', method: 'bell' },
    ]);
    const lines = recapLines(s);
    expect(lines.join(' ')).toContain('three daisies');
    expect(lines.join(' ')).toContain('big footprints');
    expect(lines.join(' ')).toContain('rang the little bell');
    expect(lines.join(' ')).not.toContain('grey fur');
  });
});
