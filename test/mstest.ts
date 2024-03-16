import { loadFixture, ethers, expect, time, anyValue } from "./setup";
import type { TestEcrecover, Implement } from "../typechain-types";

describe("MultiSignatureWallet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMultiSigFixture() {

    // Contracts are deployed using the first signer/account by default
    const [owner1, owner2, owner3, otherAccount] = await hre.ethers.getSigners();
    const required = 2;

    let amount = ethers.parseUnits("100", "ether");

    let destination = otherAccount.address;
    let value = ethers.parseUnits("1", "ether");
    let emptyData = ethers.solidityPacked(["string"], [""]);
    const timestamp = Date.now();

    const MultiSig = await hre.ethers.getContractFactory("MultiSignatureWallet");
    const multiSig = await MultiSig.deploy([owner1, owner2, owner3], required, {value: amount});

    return { multiSig, owner1, owner2, owner3, otherAccount, required, amount, destination, value, emptyData, timestamp };
  }

  describe("Deployment", function () {

    it("should set the right owners and requirments", async function () {

      const { multiSig, owner1, owner2, owner3, otherAccount, required } = await loadFixture(deployMultiSigFixture);

      expect(await multiSig.CONFIRMATIONS_REQUIRED()).to.equal(required);
      expect(await multiSig.isOwner(owner1.address)).to.equal(true);
      expect(await multiSig.isOwner(owner2.address)).to.equal(true);
      expect(await multiSig.isOwner(owner3.address)).to.equal(true);
      expect(await multiSig.isOwner(otherAccount.address)).to.equal(false);

    });       

    it("should have 100 ether on balance", async function () {

      const { multiSig, amount } = await loadFixture(deployMultiSigFixture);      

      expect(await ethers.provider.getBalance(multiSig.target)).to.equal(amount);

    });                

  });

  describe("Interact with contract", function () {

    it("should allow to add new transaction with right owner and emit event", async function () {
      const { multiSig, owner1, owner2, owner3, otherAccount, destination, value, emptyData, timestamp } = await loadFixture(deployMultiSigFixture);

      const txResponse = await multiSig.addTransaction(destination, value,  emptyData, timestamp);
      const txReceipt = await txResponse.wait();

//      const blockTimestamp = (await ethers.provider.getBlock(txReceipt.block)).timestamp;                                                

      const transactionId = ethers.solidityPackedKeccak256(
            ["address", "uint256", "bytes", "uint256"],
            [destination, value, emptyData, timestamp]
      );

      const txId = await multiSig.transactions(transactionId);
//      console.log(txId);
      expect(txId[0]).to.hexEqual(destination);
      expect(txId[1]).to.equal(value);
      expect(txId[2]).to.equal(emptyData);
      expect(txId[3]).to.equal(timestamp);
      expect(txId[4]).to.equal(false);
      expect(txId[5]).to.equal(0);

      await expect(txReceipt).to.emit(multiSig, 'AddTransaction').withArgs(transactionId);
    });  

    it('should confirm a transaction', async function () {

      const { multiSig, owner1, owner2, owner3, otherAccount, destination, value, emptyData, timestamp } = await loadFixture(deployMultiSigFixture);
          
      await multiSig.addTransaction(destination, value, emptyData, timestamp);

      const transactionId = ethers.solidityPackedKeccak256(
            ["address", "uint256", "bytes", "uint256"],
            [destination, value, emptyData, timestamp]
      );

      await multiSig.connect(owner2).confirmTransaction(transactionId);

      expect(await multiSig.confirmations(transactionId, owner2.address)).to.be.true;
    });

    it('should cancel a confirmation', async function () {

      const { multiSig, owner1, owner2, owner3, otherAccount, destination, value, emptyData, timestamp } = await loadFixture(deployMultiSigFixture);

      await multiSig.addTransaction(destination, value, emptyData, timestamp);

      const transactionId = ethers.solidityPackedKeccak256(
            ["address", "uint256", "bytes", "uint256"],
            [destination, value, emptyData, timestamp]
      );

      await multiSig.connect(owner2).confirmTransaction(transactionId);
      expect(await multiSig.confirmations(transactionId, owner2.address)).to.be.true;

      await multiSig.connect(owner2).cancelConfirmation(transactionId);
      expect(await multiSig.confirmations(transactionId, owner2.address)).to.be.false;
    });     

    it("should execute a transaction with right owner and emit event 'ExecutionSuccess'", async function () {

      const { multiSig, owner1, owner2, owner3, otherAccount, destination, value, emptyData, timestamp } = await loadFixture(deployMultiSigFixture);
   
      await multiSig.addTransaction(destination, value, emptyData, timestamp);

      const transactionId = ethers.solidityPackedKeccak256(
            ["address", "uint256", "bytes", "uint256"],
            [destination, value, emptyData, timestamp]
      );

      await multiSig.connect(owner2).confirmTransaction(transactionId);
      await multiSig.connect(owner3).confirmTransaction(transactionId);

      await expect(multiSig.connect(owner2).executeTransaction(transactionId)).to.emit(multiSig, 'ExecutionSuccess');
    });

    it("should fail a transaction and emit event 'ExecutionFailure'", async function () {

      const { multiSig, owner1, owner2, owner3, otherAccount, destination, emptyData, timestamp } = await loadFixture(deployMultiSigFixture);

      let value = ethers.parseUnits("123", "ether");
      await multiSig.addTransaction(destination, value, emptyData, timestamp);

      const transactionId = ethers.solidityPackedKeccak256(
            ["address", "uint256", "bytes", "uint256"],
            [destination, value, emptyData, timestamp]
      );

      await multiSig.connect(owner2).confirmTransaction(transactionId);
      await multiSig.connect(owner3).confirmTransaction(transactionId);

      await expect(multiSig.connect(owner2).executeTransaction(transactionId)).to.emit(multiSig, 'ExecutionFailure');
    });

    it("should emit event 'Deposit'", async function () {

      const { multiSig, otherAccount, value } = await loadFixture(deployMultiSigFixture);

      const tx = otherAccount.sendTransaction({
        to: multiSig.target,
        value: value
      });           

     await expect(tx).to.emit(multiSig, 'Deposit');

    });

    it("should revert with message 'not an owner!' ", async function () {

      const { multiSig, owner1, owner2, owner3, otherAccount, destination, value, emptyData, timestamp } = await loadFixture(deployMultiSigFixture);

      await expect(multiSig.connect(otherAccount).addTransaction(destination, value,  emptyData, timestamp)).to.be.revertedWith("not an owner!");

    });   
     
  });


});
