# Multi Signature Wallet

This Solidity contract represents a multi-signature wallet with multiple owners. It allows multiple owners to manage wallet funds and requires a certain number of confirmations to execute transactions.

## Functionalities

1. **Adding a Transaction**: Owners can add new transactions to send Ether or call a function on another contract.
2. **Confirming a Transaction**: Any owner can confirm a transaction by calling `confirmTransaction` with the transaction ID.
3. **Canceling Confirmation**: An owner can cancel their confirmation of a transaction if enough signatures haven't been collected yet.
4. **Executing a Transaction**: Once the required number of confirmations is reached, any of the owners can call `executeTransaction` to execute the transaction.

## Deploying the Contract

1. Copy the contents of the `MultiSignatureWallet.sol` file.
2. Paste it into an online Solidity compiler such as Remix.
3. Compile the contract using the chosen Solidity compiler.
4. Deploy the contract on the Ethereum network, specifying the addresses of the owners and the required number of confirmations.

## Interacting with the Contract

1. **Adding a Transaction**: Call the `addTransaction` function with the recipient's address, amount, and data.
2. **Confirming a Transaction**: Any owner can call `confirmTransaction` with the transaction ID.
3. **Canceling Confirmation**: An owner can call `cancelConfirmation` to cancel their confirmation of a transaction.
4. **Executing a Transaction**: Once the required number of confirmations is reached, any owner can call `executeTransaction` to execute the transaction.

## Development and Testing

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Use a Solidity testing framework like Hardhat for development and testing of the contract.
4. Run tests using `npx hardhat test`.

## Important Note

Exercise caution when setting the number of confirmations required for a transaction. Too low a value may lead to unauthorized transactions, while too high a value may slow down the transaction execution process.

