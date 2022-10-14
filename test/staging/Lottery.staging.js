const { assert } = require("chai");
const { network, getNamedAccounts, ethers } = require("hardhat");
const { developmentchains } = require("../../helper-hardhat.config");

developmentchains.includes(network.name)
  ? describe.skip
  : describe("Lottery Staging Test", function () {
      let Lottery;
      let LotteryEntreanceFee;
      beforeEach(async function () {
        const deployer = (await getNamedAccounts()).deployer;
        Lottery = await ethers.getContract("Lottery", deployer);
        LotteryEntreanceFee = await Lottery.Get_i_EntryFee();
      });
      describe("Full Fill Random Words", async function () {
        it("Works with live chainKeepers and Live ChainLink VRf'f we get a random winner", async function () {
          const startingTimeStamp = await Lottery.GetLatestTimeStamp();
          const accounts = await ethers.getSigners();
          await new Promise(async (resolve, reject) => {
            Lottery.once("RequestedRafflewinner", async function () {
              console.log("Winner Picked Emmitted Fired");
              try {
                const RaffleState = await Lottery.getRaffleState();
                const winnerEndingbalance = await accounts[0].getBalance();
                const RecentWinner = await Lottery.Get_s_recent_Winner();
                const EndingTimeStamp = await Lottery.GetLatestTimeStamp();
                assert(RaffleState.toString(), "0");
                assert(EndingTimeStamp > startingTimeStamp);
                assert(RecentWinner.toString(), accounts[0].address);
                assert(
                  winnerEndingbalance.toString(),
                  winnerStartingBalance.add(LotteryEntreanceFee).toString()
                );
                resolve();
              } catch (error) {
                reject(error);
              }
            });
            //THis Wont Complete until our List
            await Lottery.EnterLottery({ value: LotteryEntreanceFee });
            const winnerStartingBalance = await accounts[0].getBalance();
          });

          // Set Up the Listner Just In case the Blockchain is To Fast
        });
      });
    });
