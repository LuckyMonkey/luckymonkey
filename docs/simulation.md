---
title: Lucky Monkey - the network simulation
---

# The network simulation

Everything here is in `game/src/ops.rs`. This page is the data model and the
algorithms; [How to play](gameplay.md) has the rules and numbers.

## Resources (global state)

### `Net`: the network

| Field | Meaning |
|---|---|
| `health: Vec<Health>` | per node: `Online`, `Degraded` (shown "unstable") or `Down` ("offline") |
| `alerts: Vec<Option<Alert>>` | per node: at most one open alert |
| `links: Vec<(a, b)>` | each connection once, as node indices (smaller first) |
| `neighbours: Vec<Vec<usize>>` | adjacency list built from `links` |
| `at: Vec<Vec2>` | screen position of each node card |
| `kinds`, `names` | node type (for which failures can hit) and display name |
| `watchtower` | index of the `monitor` node (forecast visibility) |
| `queued` | the fix the monkey is heading to do, for the panel highlight |
| `version` | bumped on every change; UI rebuilds when it changes |

**Links come from the node data:** each node lists `connections` by id. Unknown
ids are ignored (the original data references a `firewall-01` that does not
exist) and duplicates are removed, giving an undirected graph.

**Why one alert per node:** it keeps the panel and the badge simple, and a
node in trouble cannot gain a second problem, which stops pile-ups that would be
unreadable.

### `Alert`

    failure   which Failure
    forecast  true = not broken yet (Watchtower forecast)
    ttl       seconds until it hits (forecast) or escalates (incident)
    options   the four Actions offered, shuffled
    tried     bitmask of options already tried and wrong
    since     shift time it appeared; also its identity

`Alert::right()` is the correct action: the failure's fix, or, for a forecast,
its preventive action.

### `Shift`

`phase` (Idle / Running / Won / Lost), `clock` (seconds since 09:00), `sla`,
`score`, `fixes`, `prevented`, `next_incident`, `next_forecast`, and the last five
log lines.

### `Monkey`

| Field | Meaning |
|---|---|
| `at` | node it is at, or last left |
| `path` | nodes still to reach, in order |
| `leg`, `leg_len`, `overland` | progress (0..1) along the current leg, its length, whether it is a cross-country hike |
| `job` | the ordered fix: node, option, action, which alert (`since`), seconds left |
| `pos` | current screen position, for drawing |

## The frame, step by step

The ops systems run chained, in this order, every frame while playing:

1. **`controls`**: Enter starts a shift. Alert-row clicks and Space select a
   node and fly the camera there. G sends the monkey. 1-4 or a fix button creates
   a `Job` and calls `Monkey::send`.
2. **`walk`**: advances the monkey along `path` by speed × time. Speed is 240 px/s
   on links, 70 overland, halved if either end of the leg is unstable. Leftover
   time carries into the next leg, so fast frames cannot overshoot.
3. **`work`**: if the monkey is at its job's node and not walking, counts down.
   At zero it checks that the *same alert* is still there (by `since`; it may have
   been fixed some other way or replaced). Right: alert cleared, node online,
   points. Wrong: option greyed, −2 SLA, −8 s TTL.
4. **`clock`**: advances the shift clock, then:
   - each alert's TTL drops. An expired **forecast** becomes its incident (a
     deploy forecast picks rollback-type or migration-type 50/50 now). An expired
     **incident** puts the node down, resets TTL to 40 s, charges −6 for a
     disparity, and queues worm/DDoS spread;
   - spread: each spreader infects one random neighbour that is online and alert-free;
   - SLA drain from unstable/down nodes;
   - new incident and forecast on schedule (formulas on [How to play](gameplay.md));
   - win/lose checks.
5. **`strikes`**: reads `Strike` messages from clouds and maybe raises a
   lightning incident on the nearest node.
6. **`hud`, `alert_list`, `live_ttls`**: update the interface.

## Routing: `route(from, to)`

[Dijkstra's shortest path](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm),
written plainly: with only 28 nodes, the simple "pick the closest unvisited node"
loop (no priority queue) is instant.

- Edge cost = screen distance between the two cards, **×2 if either end is unstable**.
- A **down node can be the destination but not a waypoint**: the search never
  expands from a down node except the start.
- No route: `None`, and `Monkey::send` makes a single overland leg straight to the target.

**Why route on the network and not on the terrain:** the network is the point
of the game. Down nodes cutting off parts of the map, and having to fix the
blocker first or hike, is a real-world situation (you cannot SSH through a dead
jump host) in a playable form.

`Monkey::send(to)` keeps a leg already being walked (no teleporting back), plans
from the end of that leg, and replaces the rest of the path. `eta()` estimates
arrival for the HUD by summing remaining legs at their speeds.

## Escalation and spread, in one picture

    forecast ──(act in time with the preventive fix)──▶ prevented (+150)
       │ TTL 50-80 s runs out
       ▼
    incident: node Degraded ──(right fix)──▶ Online (+100 + 2×TTL left)
       │ TTL runs out
       ▼
    node Down (TTL resets to 40 s; disparity: −6 SLA)
       │ every further 40 s: worm / DDoS infect a neighbour
       └──(right fix, ×1.5 work time)──▶ Online

## Visual feedback driven by the model

- **Links** (`links`): faint green when both ends are online, amber when either
  is unstable, dim red when either is down.
- **Frames** (`frames`): about one per 34 px of link per direction, in two lanes
  (keep-right, 4 px apart) so the directions don't overlap, oriented along the
  link, staying clear of the cards at each end. Speed and colour by health:
  60 px/s pale green (online), 25 px/s amber (unstable), stopped dim red (down).
  If either end has a **DDoS**, every frame on its links turns red and races
  *toward* the victim at 300 px/s: the flood is visible.
- **Cards** (`cards`): colour by health; a badge above with the failure emoji (or
  the forecast emoji) bobbing; the countdown text under it (red "⏳12s" for
  incidents, amber "in 52s" for forecasts, "DOWN" when there is nothing left to
  count). Forecast badges hide when the Watchtower is down.
- **Monkey** (`monkey_token`): 🐒 beside the card, hopping while walking, with a
  yellow progress bar while working.
- **Popups**: "fixed +130", "prevented +150", "✗ didn't help" float up and fade over 2 s.

Next: [Interface](interface.md)
