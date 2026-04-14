// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title AgentCardVaultV2
 * @notice Decentralized non-custodial USDC vault with peer-to-peer transfers.
 *         Users deposit, pay for scans, withdraw, AND send USDC to other users
 *         by wallet address or by card number.
 *
 *         No owner, no admin. Fully permissionless.
 *
 *         USDC (Arc Testnet): 0x3600000000000000000000000000000000000000
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AgentCardVaultV2 {
    IERC20 public immutable USDC;
    uint256 public constant SCAN_COST = 100_000; // 0.10 USDC (6 decimals)

    // Core balances
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public scansPaid;

    // Card number <-> address mapping (for P2P by card number)
    mapping(string => address) public addressFromCardNumber;
    mapping(address => bool) public cardRegistered;

    // Global counters
    uint256 public totalScansPaid;
    uint256 public totalDeposited;
    uint256 public totalTransfers;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event ScanPaid(address indexed user, uint256 amount, uint256 newBalance, uint256 scanIndex);
    event CardRegistered(address indexed user, string cardNumber);
    event TransferredInVault(address indexed from, address indexed to, uint256 amount, string memo);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "USDC address cannot be zero");
        USDC = IERC20(usdcAddress);
    }

    // ──────────────────────────────────────────────────────
    // Card number — deterministic 16-digit string from address
    // ──────────────────────────────────────────────────────
    function cardNumber(address user) public pure returns (string memory) {
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
     * @notice One-time call to publish your card number → address mapping.
     *         Anyone can call for themselves. Required before others can
     *         send you USDC using your card number.
     */
    function registerCard() external {
        require(!cardRegistered[msg.sender], "Already registered");
        string memory myCard = cardNumber(msg.sender);
        addressFromCardNumber[myCard] = msg.sender;
        cardRegistered[msg.sender] = true;
        emit CardRegistered(msg.sender, myCard);
    }

    // ──────────────────────────────────────────────────────
    // Deposit / Withdraw
    // ──────────────────────────────────────────────────────
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(USDC.transferFrom(msg.sender, address(this), amount), "USDC transferFrom failed");
        balanceOf[msg.sender] += amount;
        totalDeposited += amount;
        emit Deposited(msg.sender, amount, balanceOf[msg.sender]);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");
        emit Withdrawn(msg.sender, amount, balanceOf[msg.sender]);
    }

    function withdrawAll() external {
        uint256 amount = balanceOf[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        balanceOf[msg.sender] = 0;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");
        emit Withdrawn(msg.sender, amount, 0);
    }

    // ──────────────────────────────────────────────────────
    // Pay for scan (same as V1)
    // ──────────────────────────────────────────────────────
    function payForScan() external returns (uint256 scanIndex) {
        require(balanceOf[msg.sender] >= SCAN_COST, "Insufficient card balance");
        balanceOf[msg.sender] -= SCAN_COST;
        scansPaid[msg.sender] += 1;
        totalScansPaid += 1;
        scanIndex = totalScansPaid;
        emit ScanPaid(msg.sender, SCAN_COST, balanceOf[msg.sender], scanIndex);
    }

    // ──────────────────────────────────────────────────────
    // P2P Transfers (the new part)
    // ──────────────────────────────────────────────────────

    /**
     * @notice Send USDC from YOUR vault balance to another user's vault balance.
     *         No external USDC movement — just an on-chain book transfer. Very cheap gas.
     */
    function transferInVault(address to, uint256 amount, string calldata memo) external {
        require(to != address(0), "Cannot send to zero address");
        require(to != msg.sender, "Cannot send to yourself");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        totalTransfers += 1;
        emit TransferredInVault(msg.sender, to, amount, memo);
    }

    /**
     * @notice Same as transferInVault, but recipient is looked up by their card number.
     *         Recipient must have called registerCard() first.
     */
    function transferByCardNumber(string calldata cardNum, uint256 amount, string calldata memo) external {
        address to = addressFromCardNumber[cardNum];
        require(to != address(0), "Card not registered");
        require(to != msg.sender, "Cannot send to yourself");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        totalTransfers += 1;
        emit TransferredInVault(msg.sender, to, amount, memo);
    }

    // ──────────────────────────────────────────────────────
    // View helpers (save frontend RPC calls)
    // ──────────────────────────────────────────────────────
    function cardInfo(address user) external view returns (
        uint256 balance,
        uint256 scans,
        uint256 scanCost,
        bool registered,
        string memory myCardNumber
    ) {
        return (balanceOf[user], scansPaid[user], SCAN_COST, cardRegistered[user], cardNumber(user));
    }
}
