#!/usr/bin/env python3
"""Agent Arrivals collector.

Counts pull requests opened by AI coding agents on PUBLIC GitHub repositories with the
search API (through the local `gh` login) and pushes one snapshot to agents.myclawn.com.

  collect.py            tape every run; 24h totals + hourly bars once an hour; 30-day table every 12 h
  collect.py --full     force every part now
  collect.py --dry      collect, print a summary, write snapshot.json next to this file, push nothing

Every query carries is:public, so nothing from a private repository can reach the board.
No model calls, no paid API. Searches run one at a time, 5 s apart, and back off when GitHub asks.
"""
import datetime
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "state.json")
LOGDIR = os.path.join(HERE, "logs")
KEYS = os.path.expanduser("~/.config/myclawn-agents/keys.env")
BASE = os.environ.get("AGENTS_BASE", "https://agents.myclawn.com")
GAP = 5.0   # seconds between searches; grows when GitHub asks us to slow down

FAM = {
    "claude": '("Generated with Claude Code" OR head:claude/)',
    "codex": "head:codex/",
    "cursor": "head:cursor/",
    "copilot": "head:copilot/",
}
ALL = '("Generated with Claude Code" OR head:claude/ OR head:codex/ OR head:cursor/ OR head:copilot/)'
OPENED_N = {"claude": 50, "codex": 30, "cursor": 25, "copilot": 10}
LANDED_N = {"claude": 30, "codex": 15}
TURNED_N = {"claude": 20, "codex": 10}
BAD = re.compile(r"(fuck|shit|nigg|fagg|cunt|porn|nsfw|hentai|rape|nazi|onlyfans|xxx)", re.I)


def log(msg):
    os.makedirs(LOGDIR, exist_ok=True)
    line = f"{datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')} {msg}"
    with open(os.path.join(LOGDIR, "collect.log"), "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line, file=sys.stderr)


def iso(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def epoch(s):
    return int(datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp())


CALLS = 0


def search(q, n=1, sort=None, order="desc"):
    """One search request. Returns the parsed JSON, or None when GitHub would not answer."""
    global CALLS, GAP
    args = ["gh", "api", "-X", "GET", "search/issues", "-f", f"q={q}", "-f", f"per_page={n}", "-f", "advanced_search=true"]
    if sort:
        args += ["-f", f"sort={sort}", "-f", f"order={order}"]
    for attempt in range(3):
        CALLS += 1
        try:
            r = subprocess.run(args, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            time.sleep(GAP)
            continue
        time.sleep(GAP)
        try:
            j = json.loads(r.stdout)
        except Exception:
            j = {}
        if isinstance(j.get("total_count"), int):
            return j
        msg = (j.get("message") or r.stderr or "")[:140]
        if "rate limit" in msg.lower():
            GAP = min(12.0, GAP + 2.0)
            log(f"GitHub asked to slow down; waiting 75 s, then {GAP:.0f} s between searches ({q[:60]})")
            time.sleep(75)
            continue
        log(f"search failed: {q[:90]} :: {msg}")
        time.sleep(4)
    return None


def count(q):
    j = search(q)
    if j is None or j.get("incomplete_results"):
        return None
    return j["total_count"]


def totals_24h(now):
    since = iso(now - 86400)
    out = {}
    for k, sig in FAM.items():
        v = count(f"is:pr is:public {sig} created:>{since}")
        if v is not None:
            out[k] = v
    v = count(f"is:pr is:public {ALL} created:>{since}")
    if v is not None:
        out["all_agents"] = v
    v = count(f"is:pr is:public created:>{since}")
    if v is not None:
        out["all_prs"] = v
    return out


def table_30d(state, now, budget):
    """30-day table, one agent per run so a single run stays small. Returns True when something changed."""
    since = iso(now - 30 * 86400)[:10]
    table = state.setdefault("d30", {})
    stamps = state.setdefault("d30_fam_at", {})
    changed = False
    for k, sig in FAM.items():
        if budget[0] < 3 or now - stamps.get(k, 0) < 12 * 3600:
            continue
        base = f"is:pr is:public {sig} created:>={since}"
        opened = count(base)
        budget[0] -= 1
        if opened is None:
            continue
        merged = count(base + " is:merged")
        turned = count(base + " is:closed is:unmerged")
        budget[0] -= 2
        table[k] = {"opened": opened, "merged": merged, "turned": turned}
        stamps[k] = now
        state["d30_at"] = now
        changed = True
    return changed


def hour_bars(state, now, budget):
    """PRs opened per finished hour, last 24 finished hours. Only missing hours are asked for, newest first."""
    have = {int(k): v for k, v in (state.get("hours") or {}).items()}
    this_hour = now - now % 3600
    wanted = [this_hour - 3600 * i for i in range(24, 0, -1)]
    for h in reversed(wanted):
        if h in have:
            continue
        if budget[0] < 1:
            break
        v = count(f"is:pr is:public {ALL} created:{iso(h)}..{iso(h + 3599)}")
        budget[0] -= 1
        if v is not None:
            have[h] = v
    state["hours"] = {str(h): have[h] for h in wanted if h in have}
    return [{"t": h, "n": have[h]} for h in wanted if h in have]


def conv(it, agent, status):
    try:
        repo = it["repository_url"].split("/repos/")[1]
        title = re.sub(r"\s+", " ", it.get("title") or "").strip()
        stamp = it["created_at"] if status == "opened" else (it.get("closed_at") or it.get("updated_at"))
        if len(title) < 4 or BAD.search(title) or BAD.search(repo):
            return None
        return {"t": epoch(stamp), "a": agent, "s": status, "r": repo, "n": int(it["number"]), "title": title[:110], "assoc": it.get("author_association") or ""}
    except Exception:
        return None


def tape(now):
    items = []
    for k, n in OPENED_N.items():
        j = search(f"is:pr is:public {FAM[k]} created:>{iso(now - 25 * 60)}", n, "created")
        for it in (j or {}).get("items", []):
            c = conv(it, k, "opened")
            if c:
                items.append(c)
    fresh = now - 45 * 60
    # Bounded in time on purpose: the same searches over all of GitHub's history time out.
    for status, sizes, extra in (("landed", LANDED_N, f"is:merged merged:>{iso(fresh)}"), ("turned", TURNED_N, f"is:closed is:unmerged closed:>{iso(fresh)}")):
        for k, n in sizes.items():
            j = search(f"is:pr is:public {extra} {FAM[k]}", n, "updated")
            for it in (j or {}).get("items", []):
                c = conv(it, k, status)
                if c and c["t"] >= fresh:
                    items.append(c)
    seen, out = set(), []
    for it in sorted(items, key=lambda x: -x["t"]):
        key = (it["r"], it["n"], it["s"])
        if key in seen or it["t"] > now + 120:
            continue
        seen.add(key)
        out.append(it)
    return out[:180]


def sample(items):
    opened = [i for i in items if i["s"] == "opened"]
    if len(opened) < 50:
        return None
    owner = sum(1 for i in opened if i["assoc"] == "OWNER")
    team = sum(1 for i in opened if i["assoc"] in ("MEMBER", "COLLABORATOR"))
    return {"n": len(opened), "owner": owner, "team": team, "outside": len(opened) - owner - team}


def busy_repos(state, items, now):
    """Repositories with the most agent pull requests among those that passed over the board in the last 6 hours.
    Each pull request is counted once. It is a sample of all arrivals, and the page says so."""
    seen = state.get("busy_seen") or []
    seen_set = set(seen)
    buckets = state.get("busy_buckets") or {}
    b = str(now - now % 300)
    cur = buckets.setdefault(b, {})
    for it in items:
        if it["s"] != "opened":
            continue
        key = f'{it["r"]}#{it["n"]}'
        if key in seen_set:
            continue
        seen_set.add(key)
        seen.append(key)
        cur[it["r"]] = cur.get(it["r"], 0) + 1
    horizon = now - 6 * 3600
    buckets = {k: v for k, v in buckets.items() if int(k) >= horizon}
    state["busy_buckets"] = buckets
    state["busy_seen"] = seen[-6000:]
    total = {}
    for v in buckets.values():
        for r, n in v.items():
            total[r] = total.get(r, 0) + n
    top = sorted(total.items(), key=lambda x: (-x[1], x[0]))[:12]
    span = (now - min(int(k) for k in buckets)) / 3600 if buckets else 0
    return [{"r": r, "n": n} for r, n in top if n >= 3], round(span + 5 / 60, 1)


def read_key():
    try:
        for line in open(KEYS, encoding="utf-8"):
            if line.startswith("INGEST_KEY="):
                return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return ""


def push(snapshot):
    key = read_key()
    if not key:
        raise RuntimeError(f"no INGEST_KEY in {KEYS}")
    req = urllib.request.Request(
        BASE + "/api/ingest",
        data=json.dumps(snapshot).encode(),
        headers={"content-type": "application/json", "authorization": f"Bearer {key}", "user-agent": "myclawn-agents-collector/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode()[:200]


def save(state):
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(tmp, STATE)


def main():
    full = "--full" in sys.argv
    dry = "--dry" in sys.argv
    now = int(time.time())
    try:
        state = json.load(open(STATE, encoding="utf-8"))
    except Exception:
        state = {}

    items = tape(now)
    if not items:
        log("no tape items (search down or gh not logged in); nothing pushed")
        return 1

    # Each run asks for a little more than the tape, so one run never leans on GitHub for long:
    # the 24-hour totals once an hour, then missing hour bars, then one agent of the 30-day table.
    budget = [40 if full else 8]
    if full or now - state.get("h24_at", 0) > 55 * 60:
        h24 = totals_24h(now)
        budget[0] -= 6
        if "all_agents" in h24:
            state["h24"], state["h24_at"] = h24, now
            save(state)
    hours = hour_bars(state, now, budget)
    save(state)
    if table_30d(state, now, budget):
        save(state)

    busy, busy_hours = busy_repos(state, items, now)
    save(state)
    snapshot = {
        "at": state.get("h24_at") or now,
        "tape_at": now,
        "h24": state.get("h24") or {},
        "d30": state.get("d30") or {},
        "d30_at": state.get("d30_at") or 0,
        "hours": hours,
        "sample": sample(items),
        "busy": busy,
        "busy_hours": busy_hours,
        "tape": [{k: v for k, v in it.items() if k != "assoc"} for it in items],
    }
    summary = f"calls={CALLS} tape={len(items)} h24_all={snapshot['h24'].get('all_agents')} all_prs={snapshot['h24'].get('all_prs')} hours={len(hours)} d30={list(snapshot['d30'])}"
    if dry:
        with open(os.path.join(HERE, "snapshot.json"), "w", encoding="utf-8") as f:
            json.dump(snapshot, f)
        log("dry " + summary)
        return 0
    try:
        res = push(snapshot)
        log(f"pushed {summary} -> {res}")
    except Exception as e:
        log(f"push failed: {e} ({summary})")
        return 1
    feedback(snapshot)
    return 0


def feedback(snapshot):
    """What the page is used for, for the recurring-tasks panel and the analytics page: recaps and repo reports made."""
    made = {}
    try:
        req = urllib.request.Request(BASE + "/api/tide", headers={"user-agent": "myclawn-agents-collector/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            made = (json.loads(r.read().decode()) or {}).get("made") or {}
    except Exception as e:
        log(f"feedback read failed: {e}")
        return
    recaps, reports = int(made.get("recap") or 0), int(made.get("repo") or 0)
    total = snapshot["h24"].get("all_agents")
    line = f"{recaps} recaps and {reports} repo reports made so far; board shows {total:,} agent pull requests in 24 h" if total else f"{recaps} recaps and {reports} repo reports made so far"
    with open(os.path.join(HERE, "loop.json"), "w", encoding="utf-8") as f:
        json.dump({"at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "summary": line}, f)
    try:
        subprocess.run([os.path.expanduser("~/.local/bin/loop"), "put", "agent-arrivals", f"recaps={recaps}", f"repo_reports={reports}"], capture_output=True, timeout=20)
    except Exception:
        pass


if __name__ == "__main__":
    sys.exit(main())
