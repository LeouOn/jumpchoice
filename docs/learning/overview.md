# Language Learning

JumpChoice's tutor mode for Conversation chats: a side panel that turns any
Discord-style conversation into a guided language-learning session with
corrections, vocabulary tracking, and spaced review.

This is a fork feature. It layers on top of normal Conversation mode — the chat
itself (generation, swipes, agents, media) is unchanged.

## Where to find it

The **graduation-cap toggle** in the top bar (left of the panel rail) switches
the active Conversation chat to the Language Learning surface. The toggle is
global for the session and only affects Conversation-mode chats; Roleplay and
Game are untouched.

## The learning side panel

With the toggle on, a panel docks to the right of the conversation:

- **No language yet** — the setup wizard runs inline: pick a target language,
  your native language, a tutor persona, and a starting CEFR level (A1–C2 or
  auto).
- **Language active** — the panel shows **Corrections** for the current chat at
  the top and your **Vocabulary** list below. Start a **Review session** any
  time; review cards take over the panel until finished.

## How the data flows

- Languages, vocabulary, corrections, and review state live server-side under
  `/api/learning` (file-backed storage, per-user).
- Corrections are recorded per chat, so each conversation keeps its own
  correction history.
- Vocabulary accumulates across chats for the active language; review sessions
  draw from that shared pool.

## Notes and limits

- The tutor side panel is a fixed-width desktop layout; on narrow screens,
  treat it as desktop-only for now.
- The active language is a session-level selection — the wizard reappears after
  a reload, while all saved languages, vocabulary, and corrections persist
  server-side.
