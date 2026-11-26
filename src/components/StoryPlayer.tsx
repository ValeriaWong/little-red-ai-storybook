import { useEffect, useReducer, useState } from 'react';
import { isFirebaseConfigured } from '../firebase';
import { speakLines, speechSupported, stopSpeaking } from '../speech';
import {
  availableCards,
  askedCardDetails,
  getNode,
  recapLines,
  reduce,
} from '../story/engine';
import {
  CARDS,
  CARD_ORDER,
  ENDING_TITLES,
  INITIAL_STATE,
  wolfNote,
  type StoryNode,
} from '../story/story';
import AiPanel from './AiPanel';

function sceneTextForAi(node: StoryNode): string {
  switch (node.kind) {
    case 'cover':
      return node.subtitle;
    case 'narration':
      return node.lines.join(' ');
    case 'choice':
      return node.question;
    case 'cards':
      return node.intro;
    case 'help':
      return node.intro;
    case 'ending':
      return `${node.uniqueMoment} ${node.lines.join(' ')}`;
    case 'recap':
      return 'The story has ended happily. Grandma, Red, and the hunter are together at the table.';
  }
}

function speakableLines(node: StoryNode): string[] {
  switch (node.kind) {
    case 'cover':
      return [node.title, node.subtitle];
    case 'narration':
      return node.lines;
    case 'choice':
      return [node.question];
    case 'cards':
      return [node.intro];
    case 'help':
      return [node.intro];
    case 'ending':
      return [node.uniqueMoment, ...node.lines];
    case 'recap':
      return ['The story has ended happily.'];
  }
}

// B1 daisy hotspots, positioned over the three daisies in flowers.jpg
// (K05 keyframe: daisy bush + Red + basket, three flowers clearly visible).
const DAISIES = [
  { id: 'daisy-1', left: '17%', top: '74%' },
  { id: 'daisy-2', left: '26%', top: '69%' },
  { id: 'daisy-3', left: '35%', top: '75%' },
];
const COUNT_WORDS = ['One!', 'Two!', 'Three!'];
// Flowerbed branch hotspot, over the grey tuft on the branch in fork.jpg.
const FUR_SPOT = { left: '84%', top: '64%' };

export default function StoryPlayer() {
  const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
  const [reading, setReading] = useState(false);
  // B1 flower game (v5: tap three daisies, each flies into the basket,
  // Red counts "One, two, three!") and the flowerbed branch tap (v5: tap
  // the branch to find the grey fur). Both are UI-only pre-steps; the
  // engine state machine is untouched — the game dispatches the same
  // 'choose' action the plain button used to.
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [foundFur, setFoundFur] = useState(false);
  const node = getNode(state);
  // Reset the mini-games whenever the story moves to another node.
  useEffect(() => {
    setPicking(false);
    setPicked([]);
    setFoundFur(false);
  }, [node.id]);
  const configured = isFirebaseConfigured();
  const pastFork = state.node !== 'cover' && state.node !== 'kitchen' && state.node !== 'gate' && state.node !== 'b1' && state.node !== 'b2';

  function readAloud() {
    if (reading) {
      stopSpeaking();
      setReading(false);
      return;
    }
    speakLines(speakableLines(node), () => setReading(false));
    setReading(true);
  }

  const wolf = wolfNote(state);

  return (
    <main className="stage">
      <header className="masthead">
        <h1>🧺 Little Red Riding Hood</h1>
        <p className="tagline">An offline-first interactive storybook · on-device AI + cloud</p>
      </header>

      {!configured && (
        <p className="config-banner" role="status">
          ⚙️ Firebase not connected yet — AI features will light up when the Firebase
          project is connected (expected Nov 19). The story works fully without it.
        </p>
      )}

      {node.kind === 'cover' && (
        <section className="scene">
          <img src={`images/${node.image}`} alt="A little wooden house with a red roof at the end of a forest path" />
          <h2>{node.title}</h2>
          <p className="narration">{node.subtitle}</p>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'start' })}>
            ▶ {node.startLabel}
          </button>
        </section>
      )}

      {node.kind === 'narration' && (
        <section className="scene">
          {node.id === 'flowerbed' ? (
            <div className="tap-field">
              <img src={`images/${node.image}`} alt={node.imageAlt} />
              <button
                type="button"
                className={`hotspot${foundFur ? ' picked' : ''}`}
                style={{ left: FUR_SPOT.left, top: FUR_SPOT.top }}
                aria-label={foundFur ? 'Grey fur found' : 'Tap the branch'}
                onClick={() => setFoundFur(true)}
              >
                {foundFur ? '✓' : '🔍'}
              </button>
            </div>
          ) : (
            <img src={`images/${node.image}`} alt={node.imageAlt} />
          )}
          <h2>{node.title}</h2>
          {node.id === 'reunion' && state.gift === 'flowers' && (
            <p className="narration">
              Red puts the three daisies in a little cup. Grandma sets the cup in the
              middle of the table. &ldquo;This way, while we eat the cake, we can see the
              flowers too.&rdquo;
            </p>
          )}
          {node.id === 'reunion' && state.gift === 'greeting' && (
            <p className="narration">
              Red says: &ldquo;Grandma, I&rsquo;m here to keep you company!&rdquo; Grandma
              opens her arms. &ldquo;That&rsquo;s my favourite thing to hear.&rdquo;
            </p>
          )}
          {node.id === 'flowerbed' ? (
            <>
              <p className="narration">{node.lines[0]}</p>
              {foundFur ? (
                <p className="narration">{node.lines[1]}</p>
              ) : (
                <p className="narration">Tap the branch — what&rsquo;s that grey thing?</p>
              )}
            </>
          ) : (
            node.lines.map((line, i) => (
              <p className="narration" key={i}>{line}</p>
            ))
          )}
          {wolf && node.id === 'interlude' && <p className="note">{wolf}</p>}
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'next' })}>
            {node.nextLabel} →
          </button>
        </section>
      )}

      {node.kind === 'choice' && (
        <section className="scene">
          {node.id === 'b1' && picking ? (
            <div className="tap-field">
              <img src={`images/${node.image}`} alt={node.imageAlt} />
              {DAISIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`hotspot daisy${picked.includes(d.id) ? ' picked' : ''}`}
                  style={{ left: d.left, top: d.top }}
                  aria-label={picked.includes(d.id) ? 'Daisy picked' : 'Tap this daisy'}
                  disabled={picked.includes(d.id)}
                  onClick={() => setPicked((prev) => [...prev, d.id])}
                >
                  🌼
                </button>
              ))}
            </div>
          ) : (
            <img src={`images/${node.image}`} alt={node.imageAlt} />
          )}
          <h2>{node.title}</h2>
          {node.id === 'b1' && picking ? (
            <>
              <p className="narration">Tap a daisy — one, two, three, into the basket!</p>
              <p className="basket-count" role="status">
                🧺 Basket: {picked.length} of 3
                {picked.length > 0 && picked.length < 3 && ` — ${COUNT_WORDS[picked.length - 1]}`}
              </p>
              {picked.length === 3 && (
                <>
                  <p className="narration">Three daisies, gently in the basket.</p>
                  <div className="choices">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setPicking(false);
                        setPicked([]);
                        dispatch({ type: 'choose', optionId: 'flowers' });
                      }}
                    >
                      Put them in the basket →
                    </button>
                  </div>
                </>
              )}
              <div className="choices">
                <button className="btn btn-secondary" onClick={() => { setPicking(false); setPicked([]); }}>
                  ← Back to choose
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="narration">{node.question}</p>
              <div className="choices">
                {node.options.map((opt) => (
                  <button
                    key={opt.id}
                    className="btn btn-choice"
                    onClick={() => {
                      if (node.id === 'b1' && opt.id === 'flowers') {
                        setPicking(true);
                      } else {
                        dispatch({ type: 'choose', optionId: opt.id });
                      }
                    }}
                  >
                    <strong>{opt.label}</strong>
                    {opt.detail && <span>{opt.detail}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          {node.id === 'b2' && wolf && <p className="note">{wolf}</p>}
        </section>
      )}

      {node.kind === 'cards' && (
        <section className="scene">
          <img src={`images/${state.lastCard ? CARDS[state.lastCard].image : node.image}`} alt={node.imageAlt} />
          <h2>{node.title}</h2>
          <p className="narration">{node.intro}</p>
          <p className="note">
            Cards asked: {state.askedCards.length} of 2 —{' '}
            {state.askedCards.length === 0
              ? 'you can ask up to two, or call for help right away.'
              : state.askedCards.length === 1
                ? 'one more card, or call for help now.'
                : 'that was the second card.'}
          </p>
          <div className="card-grid">
            {CARD_ORDER.map((id) => {
              const asked = state.askedCards.includes(id);
              const available = availableCards(state).includes(id);
              return (
                <button
                  key={id}
                  className={`btn btn-card${asked ? ' asked' : ''}`}
                  disabled={!available && !asked}
                  onClick={() => dispatch({ type: 'askCard', card: id })}
                >
                  {id === 'ears' && '👂 Ears'}
                  {id === 'eyes' && '👓 Eyes'}
                  {id === 'hands' && '🧤 Hands'}
                  {id === 'mouth' && '👄 Mouth'}
                  {asked && ' ✓'}
                </button>
              );
            })}
          </div>
          {state.lastCard && (
            <blockquote className="card-answer">
              <p><strong>&ldquo;{CARDS[state.lastCard].question}&rdquo;</strong></p>
              <p>&ldquo;{CARDS[state.lastCard].answer}&rdquo;</p>
              <p className="note">{CARDS[state.lastCard].action}</p>
            </blockquote>
          )}
          <button className="btn btn-help" onClick={() => dispatch({ type: 'callHelp' })}>
            🆘 Call for help now
          </button>
          <details className="asked-so-far">
            <summary>What I asked so far</summary>
            {askedCardDetails(state).length === 0 ? (
              <p>Nothing yet.</p>
            ) : (
              askedCardDetails(state).map((c) => (
                <p key={c.id}>
                  <strong>{c.question}</strong> — {c.answer}
                </p>
              ))
            )}
          </details>
        </section>
      )}

      {node.kind === 'help' && (
        <section className="scene">
          <img src={`images/${node.image}`} alt={node.imageAlt} />
          <h2>{node.title}</h2>
          <p className="narration">{node.intro}</p>
          <div className="choices">
            <button className="btn btn-help" onClick={() => dispatch({ type: 'helpMethod', method: 'shout' })}>
              <strong>📣 Shout for the hunter</strong>
              <span>&ldquo;Hunter —!&rdquo;</span>
            </button>
            <button className="btn btn-help" onClick={() => dispatch({ type: 'helpMethod', method: 'bell' })}>
              <strong>🔔 Ring the little bell</strong>
              <span>&ldquo;Ding-a-ling—&rdquo;</span>
            </button>
          </div>
        </section>
      )}

      {node.kind === 'ending' && (
        <section className="scene">
          <img src={`images/${node.image}`} alt={node.imageAlt} />
          <h2>
            {node.title}
            <span className="ending-tag">{node.ending}</span>
          </h2>
          <p className="narration unique">{node.uniqueMoment}</p>
          {node.lines.map((line, i) => (
            <p className="narration" key={i}>{line}</p>
          ))}
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'next' })}>
            {node.nextLabel} →
          </button>
        </section>
      )}

      {node.kind === 'recap' && (
        <section className="scene">
          <img src={`images/${node.image}`} alt={node.imageAlt} />
          <h2>{node.title}</h2>
          <p className="narration">
            Only what really happened this time — your gift, your discovery, and how
            you called for help.
          </p>
          <ul className="recap-list">
            {recapLines(state).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {state.ending && (
            <p className="note">
              This run ended with <strong>{state.ending} · {ENDING_TITLES[state.ending]}</strong>.
            </p>
          )}
          <div className="choices">
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'replayFromFork' })}>
              🌲 See what&rsquo;s on the other road? (start again from the fork)
            </button>
            <button className="btn btn-secondary" onClick={() => dispatch({ type: 'replay' })}>
              ↺ Play the whole story again
            </button>
          </div>
        </section>
      )}

      {node.kind !== 'cover' && (
        <AiPanel state={state} sceneTitle={node.title} sceneText={sceneTextForAi(node)} />
      )}

      <footer className="footer">
        {speechSupported() && (
          <button className="btn btn-footer" onClick={readAloud}>
            {reading ? '⏸ Stop reading' : '🔊 Read aloud'}
          </button>
        )}
        {pastFork && node.kind !== 'recap' && (
          <button className="btn btn-footer" onClick={() => dispatch({ type: 'replayFromFork' })}>
            🌲 From the fork
          </button>
        )}
        <button
          className="btn btn-footer"
          onClick={() => {
            stopSpeaking();
            setReading(false);
            dispatch({ type: 'replay' });
          }}
        >
          ↺ Start over
        </button>
      </footer>
    </main>
  );
}
