"""Compare complete tape journals without materializing a second large archive."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path


def digest(streams):
    sha = hashlib.sha256()
    size = records = 0
    for stream in streams:
        with stream:
            while chunk := stream.read(1024 * 1024):
                sha.update(chunk)
                size += len(chunk)
                records += chunk.count(b"\n")
    return {"bytes": size, "records": records, "sha256": sha.hexdigest()}


def compare(before_dir, after_zip):
    before_dir = Path(before_dir)
    old_dirs = list(before_dir.glob("session-tapes-*"))
    assert len(old_dirs) == 1, "Require one unambiguous complete tape journal"
    old_paths = sorted(old_dirs[0].glob("*.jsonl"))
    assert old_paths, "Missing original full history"
    before_coverage = json.loads((before_dir / "coverage.json").read_text())
    if Path(after_zip).is_dir():
        new_dirs = list(Path(after_zip).glob("session-tapes-*"))
        assert len(new_dirs) == 1, "Require one unambiguous complete comparison journal"
        new_paths = sorted(new_dirs[0].glob("*.jsonl"))
        assert [p.name for p in old_paths] == [p.name for p in new_paths]
        after_coverage = json.loads((Path(after_zip) / "coverage.json").read_text())
        before = digest(p.open("rb") for p in old_paths)
        after = digest(p.open("rb") for p in new_paths)
    else:
      with zipfile.ZipFile(after_zip) as archive:
        new_paths = sorted(n for n in archive.namelist()
                           if "/session-tapes-" in n and n.endswith(".jsonl"))
        assert len({str(Path(n).parent) for n in new_paths}) == 1
        assert [p.name for p in old_paths] == [Path(n).name for n in new_paths]
        coverage_paths = [n for n in archive.namelist() if n.endswith("/coverage.json")]
        assert len(coverage_paths) == 1
        after_coverage = json.loads(archive.read(coverage_paths[0]))
        before = digest(p.open("rb") for p in old_paths)
        after = digest(archive.open(n) for n in new_paths)
    assert before_coverage["ok"] and after_coverage["ok"]
    assert before_coverage["catalog"] == after_coverage["catalog"]
    catalog = before_coverage["catalog"]
    assert before["records"] == catalog["builtConfigs"] + catalog["closes"]
    assert before == after, "Historical journal bytes differ"
    return {"scenario": before_dir.name, "ok": True,
            "beforeSource": before_coverage["sourceSha256"],
            "afterSource": after_coverage["sourceSha256"],
            "tapeConfigs": catalog["builtConfigs"], "historicalCloses": catalog["closes"],
            "recordDefinition": "One metadata row per tape plus one row per historical close",
            "before": before, "after": after}


if __name__ == "__main__":
    output, *pairs = sys.argv[1:]
    assert pairs and len(pairs) % 2 == 0, "OUTPUT_JSON BEFORE_DIR AFTER_DIR_OR_ZIP [BEFORE_DIR AFTER_DIR_OR_ZIP ...]"
    results = [compare(pairs[i], pairs[i + 1]) for i in range(0, len(pairs), 2)]
    Path(output).write_text(json.dumps(results, indent=2) + "\n")
    print(json.dumps(results))
