# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""A deliberately small, independently deployed consumer of WaiverBank rights."""

from genlayer import *


class WaiverGate(gl.Contract):
    bank: Address
    policy_id: str
    action_key: str
    successful_uses: TreeMap[Address, u256]

    def __init__(self, bank: Address, policy_id: str, action_key: str):
        if not policy_id or not action_key:
            raise gl.vm.UserError("policy and action key required")
        self.bank = bank
        self.policy_id = policy_id
        self.action_key = action_key

    @gl.public.write
    def execute_with_waiver(self, waiver_id: str) -> None:
        # The caller is bound here, not an arbitrary address passed by the user.
        # Pin the governing policy. Without this, attackers could create their
        # own permissive policy in the same bank and self-approve a cheap waiver.
        allowed = gl.get_contract_at(self.bank).view().is_active_for(
            waiver_id, self.policy_id, gl.message.sender_address, self.action_key,
        )
        if not allowed:
            raise gl.vm.UserError("no effective waiver for caller/action")
        sender = gl.message.sender_address
        self.successful_uses[sender] = self.successful_uses.get(sender, u256(0)) + u256(1)

    @gl.public.view
    def uses(self, beneficiary: Address) -> u256:
        return self.successful_uses.get(beneficiary, u256(0))
