"""Local packet-integrity check only; no model, network or rule activation."""
import argparse
import hashlib
import json
from pathlib import Path

FILES = {
    "START_HERE.md", "REVIEW.md", "SOURCE.json", "CANONICAL_EXCERPT.txt", "RULE.json",
    "REVIEWER_FORM.json", "ADJUDICATION_FORM.json", "OWNER_ACCEPTANCE_FORM.json", "verify.py",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def unique(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON key")
        result[key] = value
    return result


def read_json(path):
    require(path.is_file() and not path.is_symlink(), "nonregular JSON file")
    require(path.stat().st_size <= 100000, "JSON size bound")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique)


def verify(packet, expected, original):
    require(len(expected) == 64 and all(c in "0123456789abcdef" for c in expected), "trusted expected hash required")
    require(not packet.is_symlink(), "packet directory symlink")
    entries = list(packet.iterdir())
    require({p.name for p in entries} == FILES | {"manifest.json"}, "unexpected or missing packet file")
    require(all(p.is_file() and not p.is_symlink() for p in entries), "nonregular packet member")
    require(sum(p.stat().st_size for p in entries) <= 100000, "compact packet size bound")
    manifest = read_json(packet / "manifest.json")
    require(set(manifest) == {"content", "packet_sha256", "packet_id"}, "manifest schema")
    content = manifest["content"]
    require(sha(canonical(content)) == expected == manifest["packet_sha256"], "packet identity mismatch")
    require(manifest["packet_id"] == "support-rule-packet-" + expected, "packet ID mismatch")
    require(content["schema_version"] == "astra.n15.support-rule-packet.v1", "content schema")
    records = content["files"]
    require(len(records) == len(FILES) and {r["path"] for r in records} == FILES, "file allowlist mismatch")
    for record in records:
        require(set(record) == {"path", "bytes", "sha256"}, "file record schema")
        path = packet / record["path"]  # membership above excludes traversal/absolute paths
        raw = path.read_bytes()
        require(len(raw) == record["bytes"] and sha(raw) == record["sha256"], "file hash mismatch: " + path.name)
    rule = read_json(packet / "RULE.json")
    source = read_json(packet / "SOURCE.json")
    window = source["evidence_window"]
    anchor = window["anchor"]
    text = (packet / "CANONICAL_EXCERPT.txt").read_bytes()
    require(rule["status"] == "PROPOSED_NOT_APPROVED" and rule["active"] is False
            and rule["independent_review"] == "pending" and rule["clinical_validation"] is False, "proposal state changed")
    require(rule["revision"] == content["revision"] == 1 and rule["rule_id"] == content["rule_id"], "rule identity")
    require(sha((packet / "RULE.json").read_bytes()) == content["rule_sha256"], "rule hash")
    require(sha((packet / "SOURCE.json").read_bytes()) == rule["source_record_sha256"], "source record hash")
    require(rule["source_window_id"] == window["id"] and rule["required_source_role"] == window["role"] == "formal_requirement", "canonical identity/role")
    require(text == anchor["text"].encode("utf-8") == rule["proposed_answer"]["text"].encode("utf-8"), "complete excerpt differs")
    require(sha(text) == anchor["text_sha256"] == rule["proposed_answer"]["text_sha256"], "excerpt hash")
    require(anchor["offset_unit"] == "UTF-16 code units"
            and len(anchor["text"].encode("utf-16-le")) // 2 == anchor["end"] - anchor["start"], "span units")
    require(rule["proposed_answer"]["citation"] == anchor, "answer provenance differs")
    require(source["physical_pdf_page"] == anchor["page_index"] == 134, "page location")
    require(all(e["review_status"] == "pending" for e in rule["examples"]), "example approval fabricated")
    for name, field in [("REVIEWER_FORM.json", "reviewer_fields"),
                        ("ADJUDICATION_FORM.json", "adjudicator_fields"),
                        ("OWNER_ACCEPTANCE_FORM.json", "owner_fields")]:
        form = read_json(packet / name)
        require(form[field] and all(v == "" for v in form[field].values()), "review/owner fields must remain blank")
    require(original.is_file() and not original.is_symlink(), "preserved original unavailable/nonregular")
    digest = hashlib.sha256()
    with original.open("rb") as stream:
        while block := stream.read(1048576):
            digest.update(block)
    require(digest.hexdigest() == anchor["original_sha256"] == window["source"]["original_sha256"], "original publication hash")
    return {"status": "PASS_PACKET_INTEGRITY_ONLY", "packet_sha256": expected,
            "rule_sha256": content["rule_sha256"], "files": len(FILES) + 1,
            "original_sha256": digest.hexdigest(), "canonical_excerpt_sha256": sha(text),
            "actual_reviews": 0, "rule_active": False, "signatures_authenticated": False,
            "scientific_approval": False, "clinical_validation": False, "implementation_authorized": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-packet-sha256", required=True)
    parser.add_argument("--original", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(Path(__file__).parent, args.expected_packet_sha256, args.original), sort_keys=True))
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, "PACKET INTEGRITY FAIL: " + str(error) + "\n")
