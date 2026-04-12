// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title AgentCardVault
 * @notice Decentralized non-custodial USDC vault for QuantumGuard agent payments.
 *         Users deposit USDC, pay for scans from their balance, and withdraw anytime.
 *         No owner, no admin, no freezing. Fully permissionless.
 * @dev    Deployed on Arc Testnet. USDC = 0x3600000000000000000000000000000000000000
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract AgentCardVault {
    IERC20 public immutable USDC;
    uint256 public constant SCAN_COST = 100_000; // 0.10 USDC (6 decimals)

    // User's on-chain USDC balance (their "card balance")
    mapping(address => uint256) public balanceOf;

    // Total scans paid for, per user (for the UI dashboard)
    mapping(address => uint256) public scansPaid;

    // Global counter
    uint256 public totalScansPaid;
    uint256 public totalDeposited;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event ScanPaid(address indexed user, uint256 amount, uint256 newBalance, uint256 scanIndex);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "USDC address cannot be zero");
        USDC = IERC20(usdcAddress);
    }

    /**
     * @notice Deposit USDC into your card balance.
     *         You must first call USDC.approve(vaultAddress, amount).
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(
            USDC.transferFrom(msg.sender, address(this), amount),
            "USDC transferFrom failed (did you approve?)"
        );
        balanceOf[msg.sender] += amount;
        totalDeposited += amount;
        emit Deposited(msg.sender, amount, balanceOf[msg.sender]);
    }

    /**
     * @notice Pay the standard scan fee (0.10 USDC) from your card balance.
     * @return scanIndex A unique index for this scan payment (used by the frontend)
     */
    function payForScan() external returns (uint256 scanIndex) {
        require(balanceOf[msg.sender] >= SCAN_COST, "Insufficient card balance");
        balanceOf[msg.sender] -= SCAN_COST;
        scansPaid[msg.sender] += 1;
        totalScansPaid += 1;
        scanIndex = totalScansPaid;
        emit ScanPaid(msg.sender, SCAN_COST, balanceOf[msg.sender], scanIndex);
    }

    /**
     * @notice Withdraw USDC from your card balance back to your wallet.
     *         No approval needed. No admin can freeze this.
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");
        emit Withdrawn(msg.sender, amount, balanceOf[msg.sender]);
    }

    /**
     * @notice Withdraw entire balance. Convenience function.
     */
    function withdrawAll() external {
        uint256 amount = balanceOf[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        balanceOf[msg.sender] = 0;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");
        emit Withdrawn(msg.sender, amount, 0);
    }

    /**
     * @notice Generate a deterministic 16-digit "card number" from a wallet address.
     *         Purely cosmetic — the real auth is the wallet signature.
     * @dev    Uses keccak256 of the address, takes first 16 decimal digits.
     */
    function cardNumber(address user) external pure returns (string memory) {
        bytes32 h = keccak256(abi.encodePacked(user));
        bytes memory digits = new bytes(16);
        uint256 n = uint256(h);
        for (uint256 i = 0; i < 16; i++) {
            digits[15 - i] = bytes1(uint8(48 + (n % 10)));
            n /= 10;
        }
        return string(digits);
    }

    /**
     * @notice Bundle card info for a user in one call (saves frontend RPC calls).
     */
    function cardInfo(address user) external view returns (
        uint256 balance,
        uint256 scans,
        uint256 scanCost
    ) {
        return (balanceOf[user], scansPaid[user], SCAN_COST);
    }
}
