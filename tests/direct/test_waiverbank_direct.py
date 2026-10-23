"""Actual GenLayer Direct Mode tests. Run: pytest -q tests/direct/.

These use the SDK/VM simulator, unlike tests/test_offline.py. Multi-validator
network finality still requires live StudioNet receipts and is not mocked here.
"""

POLICY_RULE = "All production deployments must be reviewed by two independent engineers."
CHARTER = "Temporary emergency exception allowed; never bypass a privacy-data disclosure prohibition."
SCOPE = "Emergency one-service hotfix addressing a confirmed incident right now."
EVIDENCE = "Recorded production incident INC-42 requires a time-bounded repair."


def setup_bank(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    # Stable GenVM SDK line for StudioNet/CLI 0.39.1. The generic latest
    # resolver in genlayer-test 0.29.2 may select an unavailable preview.
    bank = direct_deploy("contracts/WaiverBank.py", sdk_version="v0.2.12")
    bank.create_policy("security-v1", "Security review policy", POLICY_RULE, CHARTER, 4, 7, 86400)
    return bank


def submit(bank, direct_vm, direct_alice, waiver_id):
    direct_vm.sender = direct_alice
    bank.request_waiver(waiver_id, "security-v1", "HOTFIX", SCOPE, EVIDENCE, 3600)


def classify(bank, direct_vm, waiver_id, label):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", '{"impact":"' + label + '"}')
    return bank.assess_waiver(waiver_id)


def test_narrow_issue_and_gate(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-narrow")
    assert classify(bank, direct_vm, "waiver-narrow", "NARROW") == "NARROW"
    assert direct_vm.run_validator() is True
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-narrow")
    from genlayer import Address
    alice = Address(bank.get_waiver("waiver-narrow")["applicant"])
    stranger = Address("0x" + "c" * 40)
    assert bank.is_active_for("waiver-narrow", "security-v1", alice, "HOTFIX") is True, bank.get_waiver("waiver-narrow")
    assert bank.is_active_for("waiver-narrow", "security-v1", stranger, "HOTFIX") is False
    assert bank.is_active_for("waiver-narrow", "security-v1", alice, "EXPORT") is False
    assert bank.is_active_for("waiver-narrow", "another-policy", alice, "HOTFIX") is False
    assert bank.get_policy("security-v1")["active_used"] == "1"


def test_broad_exhausts_active_envelope(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-broad")
    assert classify(bank, direct_vm, "waiver-broad", "BROAD") == "BROAD"
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-broad")
    submit(bank, direct_vm, direct_alice, "waiver-overflow")
    classify(bank, direct_vm, "waiver-overflow", "NARROW")
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("active envelope exhausted"):
        bank.approve_waiver("waiver-overflow")


def test_ambiguous_rejected_without_cost(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-ambiguous")
    assert classify(bank, direct_vm, "waiver-ambiguous", "AMBIGUOUS") == "AMBIGUOUS"
    assert bank.get_waiver("waiver-ambiguous")["status"] == "DENIED"
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("not approvable"):
        bank.approve_waiver("waiver-ambiguous")
    assert bank.get_policy("security-v1")["active_used"] == "0"


def test_expiry_immediate_denial_and_exact_once_refund(
    direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob,
):
    direct_vm.warp("2026-10-23T09:00:00+00:00")
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-expiry")
    classify(bank, direct_vm, "waiver-expiry", "MODERATE")
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-expiry")
    assert bank.get_policy("security-v1")["active_used"] == "2"
    direct_vm.warp("2026-10-23T10:00:00+00:00")
    from genlayer import Address
    alice = Address(bank.get_waiver("waiver-expiry")["applicant"])
    assert bank.is_active_for("waiver-expiry", "security-v1", alice, "HOTFIX") is False
    direct_vm.sender = direct_bob
    bank.settle_expired("waiver-expiry")
    assert bank.get_policy("security-v1")["active_used"] == "0"
    assert bank.get_policy("security-v1")["lifetime_used"] == "2"
    with direct_vm.expect_revert("not ready"):
        bank.settle_expired("waiver-expiry")


def test_owner_cannot_be_bypassed(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-ownership")
    classify(bank, direct_vm, "waiver-ownership", "NARROW")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only policy owner"):
        bank.approve_waiver("waiver-ownership")


def test_validator_rejects_forged_lower_impact(
    direct_vm, direct_deploy, direct_owner, direct_alice,
):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-fake-cheap")
    classify(bank, direct_vm, "waiver-fake-cheap", "NARROW")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", '{"impact":"BROAD"}')
    # The validator independently runs the classifier. It must not ratify a
    # syntactically-valid but cheaper leader outcome.
    assert direct_vm.run_validator() is False


def test_terminal_closure(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-to-close")
    classify(bank, direct_vm, "waiver-to-close", "NARROW")
    direct_vm.sender = direct_owner
    bank.close_policy("security-v1")
    with direct_vm.expect_revert("not approvable"):
        bank.approve_waiver("waiver-to-close")


def test_double_issue_and_settlement_both_revert(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.warp("2026-10-23T09:00:00+00:00")
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-replay")
    classify(bank, direct_vm, "waiver-replay", "NARROW")
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-replay")
    with direct_vm.expect_revert("not approvable"):
        bank.approve_waiver("waiver-replay")
    direct_vm.warp("2026-10-23T10:00:00+00:00")
    bank.settle_expired("waiver-replay")
    with direct_vm.expect_revert("not ready"):
        bank.settle_expired("waiver-replay")


def test_expired_assessment_cannot_be_approved(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.warp("2026-10-23T09:00:00+00:00")
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-stale")
    classify(bank, direct_vm, "waiver-stale", "MODERATE")
    direct_vm.warp("2026-10-30T09:00:00+00:00")
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("assessment stale"):
        bank.approve_waiver("waiver-stale")
    assert bank.get_policy("security-v1")["active_used"] == "0"


def test_lifetime_credits_do_not_refund(direct_vm, direct_deploy, direct_owner, direct_alice):
    direct_vm.warp("2026-10-23T09:00:00+00:00")
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-life-first")
    classify(bank, direct_vm, "waiver-life-first", "BROAD")
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-life-first")
    direct_vm.warp("2026-10-23T10:00:00+00:00")
    bank.settle_expired("waiver-life-first")
    assert bank.get_policy("security-v1")["active_used"] == "0"
    assert bank.get_policy("security-v1")["lifetime_used"] == "4"
    submit(bank, direct_vm, direct_alice, "waiver-life-second")
    classify(bank, direct_vm, "waiver-life-second", "BROAD")
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("lifetime envelope exhausted"):
        bank.approve_waiver("waiver-life-second")


def test_policy_id_is_mandatory_in_external_check(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-policy-check")
    classify(bank, direct_vm, "waiver-policy-check", "NARROW")
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-policy-check")
    from genlayer import Address
    applicant = Address(bank.get_waiver("waiver-policy-check")["applicant"])
    assert bank.is_active_for("waiver-policy-check", "security-v1", applicant, "HOTFIX")
    assert not bank.is_active_for("waiver-policy-check", "self-authored-policy", applicant, "HOTFIX")


def test_applicant_cannot_cancel_active_waiver(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-nonrefundable")
    classify(bank, direct_vm, "waiver-nonrefundable", "NARROW")
    direct_vm.sender = direct_owner
    bank.approve_waiver("waiver-nonrefundable")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not withdrawable"):
        bank.withdraw_request("waiver-nonrefundable")


def test_duplicate_id_and_spoofed_assessment_blocked(direct_vm, direct_deploy, direct_owner, direct_alice):
    bank = setup_bank(direct_vm, direct_deploy, direct_owner)
    submit(bank, direct_vm, direct_alice, "waiver-immutable")
    with direct_vm.expect_revert("waiver id invalid or taken"):
        submit(bank, direct_vm, direct_alice, "waiver-immutable")
    classify(bank, direct_vm, "waiver-immutable", "NARROW")
    with direct_vm.expect_revert("not assessable"):
        classify(bank, direct_vm, "waiver-immutable", "BROAD")
