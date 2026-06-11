#!/usr/bin/env python3
"""One-shot dev helper: flesh out the demo workflows and add a large one.

Rewrites the `graph` column of the existing demo workflows with richer,
multi-node DAGs and inserts a brand-new ~11-node "Content publishing pipeline".
Only touches the local dev SQLite DB; safe to re-run.
"""
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "packages/gateway/.midnite/midnite.db"


def nid() -> str:
    return str(uuid.uuid4())


def node(node_id, type_, label, x, y, params=None):
    return {
        "id": node_id,
        "type": type_,
        "label": label,
        "position": {"x": x, "y": y},
        "params": params or {},
    }


def edge(source, target, source_port="main", target_port="main"):
    return {
        "id": nid(),
        "source": source,
        "sourcePort": source_port,
        "target": target,
        "targetPort": target_port,
    }


def graph(nodes, edges):
    return {"nodes": nodes, "edges": edges}


def ai(prompt, model="sonnet4.7", max_tokens=1024, system=None):
    p = {"prompt": prompt, "model": model, "maxTokens": max_tokens}
    if system:
        p["system"] = system
    return p


def http(url, method="GET", body=None, headers=None):
    p = {"method": method, "url": url, "headers": headers or {}}
    if body is not None:
        p["body"] = body
    return p


# ---------------------------------------------------------------------------
# E2E demo — fetch → branch (summarise / validate) → publish
# ---------------------------------------------------------------------------
def build_e2e():
    trig = node(nid(), "trigger.manual", "Start", 120, 320)
    fetch = node(nid(), "http.request", "Fetch order", 380, 320,
                 http("https://api.example.com/orders/latest"))
    summarize = node(nid(), "ai.claude", "Summarise order", 660, 200,
                     ai("Summarise this order payload in one sentence."))
    validate = node(nid(), "http.request", "Validate stock", 660, 440,
                    http("https://api.example.com/inventory/check", "POST",
                         body='{"orderId": "{{ $fetch.body.id }}"}'))
    publish = node(nid(), "http.request", "Post to fulfilment", 940, 320,
                   http("https://api.example.com/fulfilment", "POST",
                        body='{"summary": "{{ $summarise }}"}'))
    nodes = [trig, fetch, summarize, validate, publish]
    edges = [
        edge(trig["id"], fetch["id"]),
        edge(fetch["id"], summarize["id"]),
        edge(fetch["id"], validate["id"]),
        edge(summarize["id"], publish["id"]),
        edge(validate["id"], publish["id"]),
    ]
    return graph(nodes, edges)


# ---------------------------------------------------------------------------
# AI demo — draft → critique → revise refinement chain, then publish
# ---------------------------------------------------------------------------
def build_ai_demo():
    trig = node(nid(), "trigger.manual", "Start", 120, 300)
    draft = node(nid(), "ai.claude", "Draft answer", 380, 300,
                 ai("Write a first draft answering the user's question.", max_tokens=2048))
    critique = node(nid(), "ai.claude", "Critique draft", 660, 300,
                    ai("Critique the draft above. List concrete improvements.",
                       system="You are a meticulous editor."))
    revise = node(nid(), "ai.claude", "Revise", 940, 300,
                  ai("Rewrite the draft incorporating the critique.", max_tokens=2048))
    send = node(nid(), "http.request", "Send result", 1220, 300,
                http("https://api.example.com/messages", "POST",
                     body='{"text": "{{ $revise }}"}'))
    nodes = [trig, draft, critique, revise, send]
    edges = [
        edge(trig["id"], draft["id"]),
        edge(draft["id"], critique["id"]),
        edge(critique["id"], revise["id"]),
        edge(revise["id"], send["id"]),
    ]
    return graph(nodes, edges)


# ---------------------------------------------------------------------------
# Hook demo — webhook → interpret → branch (forward / summarise → notify)
# ---------------------------------------------------------------------------
def build_hook_demo():
    trig = node(nid(), "trigger.webhook", "Inbound webhook", 120, 320)
    interpret = node(nid(), "ai.claude", "Interpret payload", 380, 320,
                     ai("Classify this webhook payload and extract the key fields as JSON."))
    forward = node(nid(), "http.request", "Forward to service", 660, 200,
                   http("https://api.example.com/ingest", "POST",
                        body='{"data": "{{ $interpret }}"}'))
    summarize = node(nid(), "ai.claude", "Summarise for humans", 660, 440,
                     ai("Write a one-line human-readable summary of the event."))
    notify = node(nid(), "http.request", "Notify Slack", 940, 440,
                  http("https://hooks.slack.example.com/services/T000/B000/xxxx", "POST",
                       body='{"text": "{{ $summarise }}"}'))
    nodes = [trig, interpret, forward, summarize, notify]
    edges = [
        edge(trig["id"], interpret["id"]),
        edge(interpret["id"], forward["id"]),
        edge(interpret["id"], summarize["id"]),
        edge(summarize["id"], notify["id"]),
    ]
    return graph(nodes, edges)


# ---------------------------------------------------------------------------
# AI haiku — haiku → translate → critique → save chain
# ---------------------------------------------------------------------------
def build_ai_haiku():
    trig = node(nid(), "trigger.manual", "Start", 120, 300)
    haiku = node(nid(), "ai.claude", "Write haiku", 380, 300,
                 ai("Write a haiku about distributed systems.", model="haiku4.5", max_tokens=128))
    translate = node(nid(), "ai.claude", "Translate (JP)", 660, 300,
                     ai("Translate the haiku into Japanese, preserving the 5-7-5 rhythm.",
                        model="haiku4.5", max_tokens=128))
    critique = node(nid(), "ai.claude", "Rate it", 940, 300,
                    ai("Rate the haiku 1-10 and explain in one line.", model="haiku4.5", max_tokens=128))
    save = node(nid(), "http.request", "Save to gist", 1220, 300,
                http("https://api.example.com/gists", "POST",
                     body='{"haiku": "{{ $write_haiku }}", "jp": "{{ $translate_jp }}"}'))
    nodes = [trig, haiku, translate, critique, save]
    edges = [
        edge(trig["id"], haiku["id"]),
        edge(haiku["id"], translate["id"]),
        edge(translate["id"], critique["id"]),
        edge(critique["id"], save["id"]),
    ]
    return graph(nodes, edges)


# ---------------------------------------------------------------------------
# NEW: Content publishing pipeline — 11 nodes, fan-out + fan-in
# ---------------------------------------------------------------------------
def build_content_pipeline():
    trig = node(nid(), "trigger.manual", "Start", 80, 360)
    brief = node(nid(), "http.request", "Fetch topic brief", 320, 360,
                 http("https://api.example.com/briefs/next"))
    outline = node(nid(), "ai.claude", "Generate outline", 560, 360,
                   ai("Produce a 3-section outline (intro, body, conclusion) for the brief.",
                      max_tokens=1024))
    intro = node(nid(), "ai.claude", "Draft intro", 820, 140,
                 ai("Write the introduction section from the outline.", max_tokens=2048))
    body = node(nid(), "ai.claude", "Draft body", 820, 360,
                ai("Write the main body section from the outline.", max_tokens=4096))
    conclusion = node(nid(), "ai.claude", "Draft conclusion", 820, 580,
                      ai("Write the conclusion section from the outline.", max_tokens=2048))
    merge = node(nid(), "ai.claude", "Edit & merge", 1100, 360,
                 ai("Merge the three sections into one polished article. Fix flow and tone.",
                    system="You are a senior editor.", max_tokens=8192))
    seo = node(nid(), "ai.claude", "SEO metadata", 1380, 200,
               ai("Generate an SEO title, slug, and meta description for the article as JSON."))
    cms = node(nid(), "http.request", "Publish to CMS", 1380, 480,
               http("https://api.example.com/cms/articles", "POST",
                    body='{"body": "{{ $edit_merge }}"}'))
    slack = node(nid(), "http.request", "Announce in Slack", 1640, 480,
                 http("https://hooks.slack.example.com/services/T000/B000/yyyy", "POST",
                      body='{"text": "New article published: {{ $cms.body.url }}"}'))
    ping = node(nid(), "http.request", "Ping status webhook", 1900, 340,
                http("https://api.example.com/status/published", "POST",
                     body='{"seo": "{{ $seo_metadata }}", "ok": true}'))
    nodes = [trig, brief, outline, intro, body, conclusion, merge, seo, cms, slack, ping]
    edges = [
        edge(trig["id"], brief["id"]),
        edge(brief["id"], outline["id"]),
        edge(outline["id"], intro["id"]),
        edge(outline["id"], body["id"]),
        edge(outline["id"], conclusion["id"]),
        edge(intro["id"], merge["id"]),
        edge(body["id"], merge["id"]),
        edge(conclusion["id"], merge["id"]),
        edge(merge["id"], seo["id"]),
        edge(merge["id"], cms["id"]),
        edge(cms["id"], slack["id"]),
        edge(seo["id"], ping["id"]),
        edge(slack["id"], ping["id"]),
    ]
    return graph(nodes, edges)


# ---------------------------------------------------------------------------
# NEW: Branch demo — fetch → branch on body.ok → success path / failure path
# ---------------------------------------------------------------------------
def build_branch_demo():
    trig = node(nid(), "trigger.manual", "Start", 120, 280)
    fetch = node(nid(), "http.request", "Health check", 380, 280,
                 http("https://api.example.com/health"))
    branch = node(nid(), "logic.branch", "Healthy?", 660, 280,
                  {"left": "body.ok", "operator": "isTruthy"})
    ok = node(nid(), "ai.claude", "Summarise status", 940, 160,
              ai("Write a one-line 'all good' status note."))
    alert = node(nid(), "http.request", "Page on-call", 940, 400,
                 http("https://api.example.com/alerts", "POST",
                      body='{"text": "Health check failed"}'))
    nodes = [trig, fetch, branch, ok, alert]
    edges = [
        edge(trig["id"], fetch["id"]),
        edge(fetch["id"], branch["id"]),
        edge(branch["id"], ok["id"], source_port="true"),
        edge(branch["id"], alert["id"], source_port="false"),
    ]
    return graph(nodes, edges)


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    # name -> (graph, plain-text step description shown in the list view)
    updates = {
        "E2E demo": (
            build_e2e(),
            "Fetch order → summarise + validate stock in parallel → post to fulfilment.",
        ),
        "AI demo": (
            build_ai_demo(),
            "Draft → critique → revise refinement chain → send result.",
        ),
        "Hook demo": (
            build_hook_demo(),
            "Inbound webhook → interpret → forward + summarise → notify Slack.",
        ),
        "AI haiku": (
            build_ai_haiku(),
            "Write haiku → translate to Japanese → rate → save to gist.",
        ),
    }
    for name, (g, description) in updates.items():
        cur.execute(
            "UPDATE workflows SET graph = ?, description = ?, updated_at = ? WHERE name = ?",
            (json.dumps(g), description, now, name),
        )
        print(f"updated {name!r}: {len(g['nodes'])} nodes, {len(g['edges'])} edges")

    # Insert (or replace) the big one, keyed by name for idempotency.
    cur.execute("DELETE FROM workflows WHERE name = 'Content publishing pipeline'")
    g = build_content_pipeline()
    cur.execute(
        """INSERT INTO workflows
           (id, name, description, enabled, trigger_type, trigger, graph, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            nid(),
            "Content publishing pipeline",
            "Brief → outline → parallel drafting → edit → publish to CMS, Slack & status webhook.",
            1,
            "manual",
            json.dumps({"type": "manual"}),
            json.dumps(g),
            now,
            now,
        ),
    )
    print(f"inserted 'Content publishing pipeline': {len(g['nodes'])} nodes, {len(g['edges'])} edges")

    cur.execute("DELETE FROM workflows WHERE name = 'Branch demo'")
    bg = build_branch_demo()
    cur.execute(
        """INSERT INTO workflows
           (id, name, description, enabled, trigger_type, trigger, graph, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            nid(),
            "Branch demo",
            "Health check → Branch on body.ok → summarise (true) or page on-call (false).",
            1,
            "manual",
            json.dumps({"type": "manual"}),
            json.dumps(bg),
            now,
            now,
        ),
    )
    print(f"inserted 'Branch demo': {len(bg['nodes'])} nodes, {len(bg['edges'])} edges")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    main()
