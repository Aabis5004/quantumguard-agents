// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title QuantumGuardPayments
 * @notice Accepts USDC nanopayments for AI-generated Arc project audits.
 * @dev Deployed on Arc Testnet (Chain ID 5042002).
 *      USDC ERC-20 interface on Arc: 0x3600000000000000000000000000000000000000
 *      Users approve USDC, then call payForReport() with a project ID and amount.
 *      The backend listens for ReportPaid events and unlocks the report.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract QuantumGuardPayments {
    // ---------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------

    /// @notice The USDC ERC-20 contract on Arc Testnet.
    IERC20 public immutable usdc;

    /// @notice The address that deployed this contract (the agent treasury owner).
    address public owner;

    /// @notice Minimum payment per report in USDC (6 decimals). Default: 0.10 USDC.
    uint256 public minPayment = 100_000; // 0.10 * 10^6

    /// @notice Total USDC received across all reports.
    uint256 public totalCollected;

    /// @notice Maps a project ID hash to the cumulative USDC paid for that project.
    mapping(bytes32 => uint256) public paidForProject;

    /// @notice Maps a user to the total USDC they have paid.
    mapping(address => uint256) public paidByUser;

    // ---------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------

    event ReportPaid(
        address indexed payer,
        bytes32 indexed projectId,
        uint256 amount,
        uint256 timestamp
    );

    event Withdrawn(address indexed to, uint256 amount);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);
    event MinPaymentUpdated(uint256 oldAmount, uint256 newAmount);

    // ---------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "QG: not owner");
        _;
    }

    // ---------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------

    /**
     * @param _usdc The USDC ERC-20 contract address on Arc Testnet.
     *              Use 0x3600000000000000000000000000000000000000 on Arc Testnet.
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "QG: usdc is zero");
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    // ---------------------------------------------------------------
    // Core: payForReport
    // ---------------------------------------------------------------

    /**
     * @notice Pay USDC for an AI report on a specific Arc project.
     * @param projectId A hash identifying the Arc project being audited
     *                  (e.g. keccak256 of the contract address the user wants analyzed).
     * @param amount    USDC amount in 6-decimal units. Must be >= minPayment.
     *
     * Requirements:
     * - Caller must have approved this contract to spend `amount` of USDC.
     * - `amount` must be at least `minPayment`.
     */
    function payForReport(bytes32 projectId, uint256 amount) external {
        require(amount >= minPayment, "QG: amount below minimum");
        require(projectId != bytes32(0), "QG: invalid projectId");

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "QG: USDC transfer failed");

        paidForProject[projectId] += amount;
        paidByUser[msg.sender] += amount;
        totalCollected += amount;

        emit ReportPaid(msg.sender, projectId, amount, block.timestamp);
    }

    // ---------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------

    /// @notice Returns the current USDC balance held by this contract.
    function contractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Helper to derive a project ID from a contract address.
     * @dev    Frontend and backend should use this same derivation so the
     *         projectId is consistent across off-chain and on-chain.
     */
    function projectIdFromAddress(address arcProject) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(arcProject));
    }

    // ---------------------------------------------------------------
    // Owner functions
    // ---------------------------------------------------------------

    /// @notice Withdraw collected USDC to the owner address.
    function withdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "QG: amount = 0");
        bool ok = usdc.transfer(owner, amount);
        require(ok, "QG: withdraw failed");
        emit Withdrawn(owner, amount);
    }

    /// @notice Withdraw the entire USDC balance held by the contract.
    function withdrawAll() external onlyOwner {
        uint256 bal = usdc.balanceOf(address(this));
        require(bal > 0, "QG: nothing to withdraw");
        bool ok = usdc.transfer(owner, bal);
        require(ok, "QG: withdraw failed");
        emit Withdrawn(owner, bal);
    }

    /// @notice Update the minimum payment amount (in USDC 6-decimal units).
    function setMinPayment(uint256 newMin) external onlyOwner {
        emit MinPaymentUpdated(minPayment, newMin);
        minPayment = newMin;
    }

    /// @notice Transfer ownership of the contract to a new address.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "QG: new owner is zero");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }
}
