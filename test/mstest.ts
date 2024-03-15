import { loadFixture, ethers, expect, time, anyValue } from "./setup";
import type { TestEcrecover, Implement } from "../typechain-types";

describe("MultiSignatureWallet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function MultiSigFixture() {

    // Contracts are deployed using the first signer/account by default
    const [owner1, owner2, owner3, otherAccount] = await hre.ethers.getSigners();
    const required = 2;

    const amount = ethers.parseUnits("100", "ether");

    const MultiSig = await hre.ethers.getContractFactory("MultiSignatureWallet");
    const multiSig = await MultiSig.deploy([owner1, owner2, owner3], required, {value: amount});

    return { multiSig, owner1, owner2, owner3, otherAccount, required, amount };
  }

  describe("Deployment", function () {

    it("should set the right owners and requirments", async function () {
      const { multiSig, owner1, owner2, owner3, otherAccount, required } = await loadFixture(MultiSigFixture);

      expect(await multiSig.CONFIRMATIONS_REQUIRED()).to.equal(required);
      expect(await multiSig.isOwner(owner1.address)).to.equal(true);
      expect(await multiSig.isOwner(owner2.address)).to.equal(true);
      expect(await multiSig.isOwner(owner3.address)).to.equal(true);
      expect(await multiSig.isOwner(otherAccount.address)).to.equal(false);
    });       

    it("should have 100 ether on balance", async function () {
      const { multiSig, amount } = await loadFixture(MultiSigFixture);
      

      expect(await ethers.provider.getBalance(multiSig.target)).to.equal(amount);
    });                

  });

  describe("Interact with contract", function () {

    it("should allow to add transaction with right owner and emit event", async function () {
      const { multiSig, owner1, owner2, owner3, otherAccount } = await loadFixture(MultiSigFixture);

      let destination = multiSig.target;
      let value = ethers.parseUnits("1", "ether");
      let data = ethers.solidityPacked(["string"], [""]);

      const txResponse = await multiSig.addTransaction(destination, value,  data);
      const txReceipt = await txResponse.wait();

      const blockTimestamp = (await ethers.provider.getBlock(txReceipt.block)).timestamp;                                                

      const transactionId = ethers.solidityPackedKeccak256(
            ["address", "uint256", "bytes", "uint256"],
            [destination, value, data, blockTimestamp]
        );

      const txId = await multiSig.transactions(transactionId);
//      console.log(txId);
      expect(txId[0]).to.hexEqual(destination);
      expect(txId[1]).to.equal(value);
      expect(txId[2]).to.equal(data);
      expect(txId[3]).to.equal(blockTimestamp);
      expect(txId[4]).to.equal(false);
      expect(txId[5]).to.equal(0);

      await expect(txReceipt).to.emit(multiSig, 'AddTransaction').withArgs(transactionId);

    });   

    it("should revert with message 'onlyOwner: not an owner!' ", async function () {
      const { multiSig, owner1, owner2, owner3, otherAccount } = await loadFixture(MultiSigFixture);

      let destination = multiSig.target;
      let value = ethers.parseUnits("2", "ether");
      let data = ethers.solidityPacked(["string"], [""]);                   

      await expect(multiSig.connect(otherAccount).addTransaction(destination, value,  data)).to.be.revertedWith("onlyOwner: not an owner!");

    });   
     
  });


});
