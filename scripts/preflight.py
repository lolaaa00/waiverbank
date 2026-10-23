"""Offline contract, network configuration and artifact sanity checks."""

import ast
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_CHAIN = 61999
EXPECTED_RPC = "https://studio.genlayer.com/api"
EXPECTED_CLI = "0.39.1"
EXPECTED_DEPENDS = '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }'


def check():
    assert (ROOT / "contracts" / "WaiverBank.py").is_file()
    assert (ROOT / "contracts" / "WaiverGate.py").is_file()
    p = json.loads((ROOT / "package.json").read_text())
    assert p["devDependencies"]["genlayer"] == EXPECTED_CLI
    assert p["config"]["chainId"] == EXPECTED_CHAIN
    assert p["config"]["rpc"] == EXPECTED_RPC
    assert not (ROOT / "frontend").exists(), "frontend outside project scope"
    checks = 4
    for filename, cls in (("WaiverBank.py", "WaiverBank"), ("WaiverGate.py", "WaiverGate")):
        source = (ROOT / "contracts" / filename).read_text()
        assert source.startswith(EXPECTED_DEPENDS), "SDK header mismatch"
        tree = ast.parse(source)
        classes = [node for node in tree.body if isinstance(node, ast.ClassDef)]
        assert len([node for node in classes if any(isinstance(b, ast.Attribute)
                   and b.attr == "Contract" for b in node.bases)]) == 1
        assert any(c.name == cls for c in classes)
        assert not re.search(r"\b(eval|exec|open|subprocess|requests)\s*\(", source)
        checks += 4
    bank = (ROOT / "contracts" / "WaiverBank.py").read_text()
    assert "run_nondet_unsafe" in bank
    assert "independent_classification() == proposed" in bank
    assert 'w.status = "DENIED"' in bank
    assert "p.lifetime_used += w.cost" in bank
    assert "p.active_used -= w.cost" in bank
    assert "def _prompt_data" in bank
    assert 'replace("<", "&lt;")' in bank
    assert 'w.status == "ACTIVE"' in bank
    assert 'w.policy_id == policy_id' in bank
    gate = (ROOT / "contracts" / "WaiverGate.py").read_text()
    assert 'self.policy_id' in gate
    checks += 10
    deploy = (ROOT / "scripts" / "guarded-deploy.mjs").read_text()
    assert "61999" in deploy and EXPECTED_RPC in deploy and "studionet" in deploy
    assert "node_modules" in deploy
    checks += 4
    print(f"PASS: {checks} offline structural/network preflight assertions")


if __name__ == "__main__":
    try:
        check()
    except (AssertionError, KeyError, FileNotFoundError, SyntaxError) as exc:
        print(f"FAIL: preflight: {exc}", file=sys.stderr)
        sys.exit(1)
