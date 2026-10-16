---
title: Lucky Monkey - failure types
---

# Failure types

The failures are jungle-dressed versions of things that really happen to
production systems. The "right fix" for each is the standard first response an
operator would reach for. Defined in `game/src/ops.rs` (`enum Failure`,
`enum Action`).

The design rule: **the symptom text must contain enough to choose correctly.**
Each wrong option is plausible for *some* failure, so the player has to read.

---

## 🐘 DDoS stampede → 🛡️ Rate-limit at the firewall

**In game:** "Requests x40. A herd of 9,000 monkeys is hammering one endpoint."
Links into the node fill with fast red frames heading in. When it goes down, it
spills onto a neighbour.

**In reality:** a [distributed denial-of-service attack](https://en.wikipedia.org/wiki/Denial-of-service_attack)
floods a service with more requests than it can handle, from many sources.
The first response is to shed load before it reaches the service:
[rate limiting](https://en.wikipedia.org/wiki/Rate_limiting) and filtering at the edge.
Restarting does nothing (the flood continues); failing over just moves the target.

**Why it spreads:** in real systems an overloaded service fails and its traffic
(or its retries) lands on its neighbours, which then also overload. This is a
[cascading failure](https://en.wikipedia.org/wiki/Cascading_failure).

## 🐛 Worm → 🚧 Quarantine the node · forecast 🧬 → 🩹 Patch

**In game:** "Unknown process copying itself over every API connection." Every
time its countdown expires, it infects a healthy neighbour.

**In reality:** a [computer worm](https://en.wikipedia.org/wiki/Computer_worm)
self-replicates across a network through a vulnerability. Containment first:
isolate the host so it cannot spread, then clean it. Restarting an infected
machine usually brings the worm back on boot.

**The proactive version:** a known worm signature is circulating and a node is
unpatched. Applying the patch closes the hole before the worm arrives. This is
the reason patch management exists.

## ⚖️ Replica disparity → 🔁 Resync replicas from primary

**In game:** "Replica checksums disagree: two copies, two different banana
counts." Only on data stores. If it goes down, data is lost (−6% SLA).

**In reality:** databases keep copies (replicas) for safety and speed. If they
diverge (replication broke, or a [split-brain](https://en.wikipedia.org/wiki/Split-brain_(computing))
let two nodes both accept writes) reads return different answers depending on which
copy you hit. The fix is to pick the authoritative copy (the primary) and
re-copy the replicas from it. Restarting does not reconcile data; it can make
the divergence permanent. This one takes the longest (7 s) because resyncing
data is slow.

## 📦 Bad deploy (no schema change) → ⏪ Roll back
## 📦 Bad deploy + migration → ⏩ Fall forward: ship a hotfix

These two are deliberately twins. Both say "v2.4 went out and the error rate is
30%". The difference is one sentence:

- "**No schema change**: v2.3 is still compatible." → **roll back**. Return to
  the previous version; it is fast and known-good.
- "v2.4 **migrated the schema** ... v2.3 can't read the new tables." → **fall
  forward** (also called *roll forward*): fix the bug in a new version, because
  the old version can no longer work against the changed database.

**In reality:** a database migration that changes the shape of the data is often
one-way. Rolling the code back leaves old code facing new data, which is worse.
Teams then ship a hotfix instead. Knowing which situation you are in before
pressing the rollback button is a real and costly lesson.

**The proactive version:** a deploy is scheduled. Sending it through a
[canary release](https://martinfowler.com/bliki/CanaryRelease.html) (to a small
share of traffic first) catches a bad build before everyone gets it. Ignore the
forecast and it lands as one of the two twins, 50/50.

## ⚡ Lightning strike → 🔌 Fail over to standby

**In game:** "Lightning hit the rack. The primary power supply is dead." Caused
by a storm cloud flashing near a node. The only failure that comes from the map
itself.

**In reality:** hardware failure (power, disk, a whole machine). Nothing on the
box can fix it; the response is [failover](https://en.wikipedia.org/wiki/Failover)
to redundant standby capacity. Short TTL (28 s) because hardware loss is abrupt.

## 🔐 Expired certificate → 🔑 Rotate the certificate · forecast 🔐 → 🔑 Rotate

**In game:** "TLS handshakes failing. The certificate expired."

**In reality:** [TLS](https://en.wikipedia.org/wiki/Transport_Layer_Security)
certificates have expiry dates. When one lapses, every client refuses to
connect. It is the classic *entirely preventable* outage, which is why it is also
a forecast. The same action works before (renew) and after (replace).

## 🍌 Memory leak → 🔄 Restart the service

**In game:** "Banana heap growing 2 GB/min, swap is thrashing. Nothing else is wrong."

**In reality:** a [memory leak](https://en.wikipedia.org/wiki/Memory_leak) is a
program that never frees memory it no longer needs, until the machine runs out
and starts swapping. A restart frees it all and buys time while the bug is
found. "Nothing else is wrong" is the clue that the blunt fix is the right one here.

## 💾 Disk full → 🧹 Clean up old snapshots · forecast 💾 → 🧹 Clean up

**In game:** "Disk 100%. Writes failing, logs can't rotate, the replicas are stuck."
Only on data stores.

**In reality:** disks fill with logs, backups and snapshots. When a disk is full
nothing can be written. Freeing space is the immediate fix; the forecast version
("85% and climbing") is what capacity alerts are for.

---

## Distractor design

`options_for()` builds the four choices: the right one, plus (for deploys) its
twin, plus random others, shuffled. Distractors are always *real* actions from
the same toolbox, so the panel never contains an obviously silly answer.

## Ideas not built yet

From the owner's brief ("fall forward, database disparity, DDoS attack, worm,
etc."), candidates for more types: DNS outage at the DNS Shrine (names stop
resolving, so routes fail), message queue backlog at the Falls, auth/token
expiry at the Auth Gate, CDN cache poisoning, a noisy neighbour, clock drift.
See [Extending](extending.md).

Next: [The engine](engine.md)
