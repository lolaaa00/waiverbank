"""Reproducible SHA-256 hashes of the exact deployable source bytes."""

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for filename in ("WaiverBank.py", "WaiverGate.py"):
    file = ROOT / "contracts" / filename
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    print(f"{digest}  contracts/{filename}")
