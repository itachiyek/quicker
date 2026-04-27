// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * Quicker Challenge Escrow v3 — designed for the Quicker MiniKit flow.
 *
 *   1. Player calls token.transfer(address(this), fullAmount) via MiniKit.
 *   2. Backend (owner) verifies the on-chain transfer and calls
 *      recordDeposit(...) — fee is split off immediately to feeRecipient.
 *   3. Both players play the round.
 *   4. Backend calls resolveChallenge(...) for a winner OR resolveTie(...)
 *      for a draw / cancellation refund.
 *   5. Player calls claim(token) via MiniKit to withdraw their winnings.
 *
 * Trust model: backend is the sole owner; players never approve. Fees are
 * irrevocable and paid out at deposit time, by design.
 */
contract ChallengeEscrow {
    address public owner;
    address public feeRecipient;
    uint8 public feePercent = 10;

    // token => lobbyId => total escrowed (after fees) waiting on a result
    mapping(address => mapping(bytes32 => uint256)) public escrowed;
    // user => token => claimable balance ready to withdraw
    mapping(address => mapping(address => uint256)) public claimable;

    event DepositRecorded(
        address indexed token,
        bytes32 indexed lobbyId,
        address indexed user,
        uint256 fullAmount,
        uint256 fee,
        uint256 escrowedAmount
    );
    event Resolved(
        bytes32 indexed lobbyId,
        address indexed winner,
        address token,
        uint256 amount
    );
    event TieResolved(
        bytes32 indexed lobbyId,
        address token,
        address a,
        address b,
        uint256 amountA,
        uint256 amountB
    );
    event Claimed(address indexed user, address indexed token, uint256 amount);
    event FeePercentChanged(uint8 oldFee, uint8 newFee);
    event FeeRecipientChanged(address oldRecipient, address newRecipient);
    event OwnerChanged(address oldOwner, address newOwner);

    error OnlyOwner();
    error TransferFailed();
    error ZeroAmount();
    error FeeTooHigh();
    error InvalidAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _feeRecipient) {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    /**
     * Backend records a deposit after the user already transferred tokens
     * directly to this contract. Splits fee to feeRecipient and credits the
     * remainder to the lobby's escrow.
     *
     * @param token        ERC-20 contract (WLD or USDC on World Chain)
     * @param lobbyId      keccak256 of the off-chain lobby id
     * @param user         depositor's wallet (informational; verified server-side)
     * @param fullAmount   amount the user sent in the transfer
     */
    function recordDeposit(
        address token,
        bytes32 lobbyId,
        address user,
        uint256 fullAmount
    ) external onlyOwner {
        if (fullAmount == 0) revert ZeroAmount();

        uint256 fee = (fullAmount * feePercent) / 100;
        uint256 toEscrow = fullAmount - fee;

        if (fee > 0) {
            bool ok = IERC20(token).transfer(feeRecipient, fee);
            if (!ok) revert TransferFailed();
        }

        escrowed[token][lobbyId] += toEscrow;
        emit DepositRecorded(token, lobbyId, user, fullAmount, fee, toEscrow);
    }

    /**
     * Resolve a challenge with a single winner: the entire pooled escrow
     * for this lobby moves to the winner's claimable balance.
     */
    function resolveChallenge(
        address token,
        bytes32 lobbyId,
        address winner
    ) external onlyOwner {
        if (winner == address(0)) revert InvalidAddress();
        uint256 amount = escrowed[token][lobbyId];
        if (amount == 0) return;

        escrowed[token][lobbyId] = 0;
        claimable[winner][token] += amount;
        emit Resolved(lobbyId, winner, token, amount);
    }

    /**
     * Resolve a tie or refund: split the escrowed amount evenly between two
     * addresses. Use the same address twice to send the entire pool to one
     * party (e.g. when a lobby is cancelled before a challenger arrives and
     * the creator is the only depositor).
     */
    function resolveTie(
        address token,
        bytes32 lobbyId,
        address a,
        address b
    ) external onlyOwner {
        if (a == address(0) || b == address(0)) revert InvalidAddress();
        uint256 amount = escrowed[token][lobbyId];
        if (amount == 0) return;

        escrowed[token][lobbyId] = 0;
        uint256 halfA = amount / 2;
        uint256 halfB = amount - halfA;

        if (a == b) {
            claimable[a][token] += amount;
            emit TieResolved(lobbyId, token, a, b, amount, 0);
            return;
        }
        claimable[a][token] += halfA;
        claimable[b][token] += halfB;
        emit TieResolved(lobbyId, token, a, b, halfA, halfB);
    }

    /// Winner / split-recipient withdraws their claimable balance.
    function claim(address token) external {
        uint256 amount = claimable[msg.sender][token];
        if (amount == 0) revert ZeroAmount();
        claimable[msg.sender][token] = 0;
        bool ok = IERC20(token).transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();
        emit Claimed(msg.sender, token, amount);
    }

    function setFeePercent(uint8 _fee) external onlyOwner {
        if (_fee > 50) revert FeeTooHigh();
        emit FeePercentChanged(feePercent, _fee);
        feePercent = _fee;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        emit FeeRecipientChanged(feeRecipient, _feeRecipient);
        feeRecipient = _feeRecipient;
    }

    function setOwner(address _owner) external onlyOwner {
        if (_owner == address(0)) revert InvalidAddress();
        emit OwnerChanged(owner, _owner);
        owner = _owner;
    }
}
