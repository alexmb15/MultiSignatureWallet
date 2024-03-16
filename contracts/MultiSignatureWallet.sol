// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract MultiSignatureWallet {

    struct Transaction {
        address destination;
        uint value;
        bytes data;
        uint timestamp;
        bool executed;
        uint confirmations;
    }

    mapping (bytes32 => Transaction) public transactions;
    mapping (bytes32 => mapping(address => bool)) public confirmations;

    mapping (address => bool) public isOwner;
    address[] public owners;
    uint public immutable CONFIRMATIONS_REQUIRED;
       

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not an owner!");
        _;
    }

    modifier notNull(address _address) {
        require(_address != address(0), "address can't be 0!");
        _;
    }

    modifier notExecuted(bytes32 transactionId) {
        require(!transactions[transactionId].executed, "transaction alredy executed!");
        _;
    }

    modifier transactionExists(bytes32 transactionId) {
        require(transactions[transactionId].destination != address(0), "transaction not exist!");
        _;
    }

    modifier confirmed(bytes32 transactionId, address owner) {
        require(confirmations[transactionId][owner], "transaction not confirmed");
        _;
    }


   event AddTransaction(bytes32 transactionId);
   event ExecutionSuccess(bytes32 indexed transactionId);
   event ExecutionFailure(bytes32 indexed transactionId);
   event Deposit(address indexed sender, uint value);


    /// @dev Contract constructor sets initial owners and required number of confirmations.
    /// @param _owners List of initial owners.
    /// @param _numConfirmationsRequired Number of required confirmations.
    constructor(address[] memory _owners, uint _numConfirmationsRequired) 
	payable     	

    {
        CONFIRMATIONS_REQUIRED = _numConfirmationsRequired;

        require(_owners.length > 0, "Owners required");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "Invalid number of confirmations required");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Duplicate owner");

            isOwner[owner] = true;
            owners.push(owner);
        }
        
    }


    /// @dev Adds a new transaction to the transaction mapping, if transaction does not exist yet.
    /// @param destination Transaction target address.
    /// @param value Transaction ether value.
    /// @param data Transaction data payload.
    /// @return transactionId Returns transaction ID.
    function addTransaction(address destination, uint value, bytes memory data, uint timestamp)
        external
        onlyOwner
        notNull(destination)
        returns (bytes32 transactionId)
    {

        transactionId = keccak256(abi.encodePacked(
            destination,            
	    value,
            data,            
            timestamp
        ));

        transactions[transactionId] = Transaction({
            destination: destination,
            value: value,
            data: data,
            timestamp: timestamp,
            executed: false,
	    confirmations: 0
        });


        emit AddTransaction(transactionId);

        return transactionId;
    }

    /// @dev Allows an owner to confirm a transaction.
    /// @param transactionId Transaction ID.
    function confirmTransaction(bytes32 transactionId) 
	external 
	onlyOwner
	transactionExists(transactionId)
    {
        require(!confirmations[transactionId][msg.sender], "confirmTransaction: already confirmed!");

        Transaction storage transaction = transactions[transactionId];

        transaction.confirmations++;
        confirmations[transactionId][msg.sender] = true;
    }

    /// @dev Allows an owner to revoke a confirmation for a transaction.
    /// @param transactionId Transaction ID.
    function cancelConfirmation(bytes32 transactionId) 
	external 
	onlyOwner 
	transactionExists(transactionId)
        confirmed(transactionId, msg.sender)
        notExecuted(transactionId)
    {

        Transaction storage transaction = transactions[transactionId];
        transaction.confirmations--;
        confirmations[transactionId][msg.sender] = false;
    }

    /// @dev Allows anyone to execute a confirmed transaction.
    /// @param transactionId Transaction ID.
    function executeTransaction(bytes32 transactionId)
        public
        onlyOwner
	transactionExists(transactionId)
        confirmed(transactionId, msg.sender)
        notExecuted(transactionId)
        returns(bool success, bytes memory returnData)
    {

        Transaction storage transaction = transactions[transactionId];

        if (transaction.confirmations >= CONFIRMATIONS_REQUIRED) {
            transaction.executed = true;
            (success, returnData) = transaction.destination.call{value: transaction.value}(transaction.data);
            if (success)
               emit ExecutionSuccess(transactionId);
            else {
               emit ExecutionFailure(transactionId);
                transaction.executed = false;
            }
        }
    }      

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

}