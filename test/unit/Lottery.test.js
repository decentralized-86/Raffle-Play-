const {
  developmentchains,
  networkconfig,
} = require("../../helper-hardhat.config");
const { getNamedAccounts, network, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");
!developmentchains.includes(network.name)
  ? describe.skip
  : describe("Lottery unit Test", function () {
      let Lottery,
        vrfCoordinatorv2,
        chainId,
        LotteryEntreanceFee,
        deployer,
        interval;
      beforeEach(async function () {
        const { deployer } = await getNamedAccounts();
        await deployments.fixture("all");
        Lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorv2 = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        chainId = network.config.chainId;
        LotteryEntreanceFee = await Lottery.Get_i_EntryFee();
        interval = await Lottery.Get_interval();
      });
      describe("Constructor", async function () {
        it("initialize the Lottery Correctly", async function () {
          //Ideally out lotteryState is OPEN
          // We make our test have one assert per it
          const RaffleState = await Lottery.getRaffleState();
          assert.equal(RaffleState.toString(), "0");
          assert.equal(interval.toString(), networkconfig[chainId]["interval"]);
        });
      });
      describe("Enter Raffle Function", function () {
        it("Revert When Player Don't Pay Enought", async function () {
          await expect(Lottery.EnterLottery()).to.be.revertedWith(
            "Lottery__SendMoreToEnter"
          );
        });
        it("Record Player When The Enter", async function () {
          deployer = (await getNamedAccounts()).deployer;
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          const PlayerFromContract = await Lottery.Get_s_players(0);
          assert.equal(PlayerFromContract, deployer);
        });
        it("Enter Lotttery Event Emmitted Properly", async function () {
          await expect(
            Lottery.EnterLottery({ value: LotteryEntreanceFee })
          ).to.emit(Lottery, "LotteryEnter");
        });
        it("Doesn't Allow entrance if Lotttery is calculating", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          //increaseing the time of the blockchain
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          // Mining a new block
          await network.provider.send("evm_mine", []);
          await Lottery.performUpkeep([]);
          await expect(
            Lottery.EnterLottery({ value: LotteryEntreanceFee })
          ).to.be.revertedWith("Lottery__RaffleNotOpen");
        });
      });
      describe("CheckUpKeep", function () {
        it("returns false if people haven't send Eth", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepneeded } = await Lottery.callStatic.checkUpkeep("0x");
          assert(!upkeepneeded);
        });
        it("returns false if the Lottery is not open", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await Lottery.performUpkeep([]);
          const RaffleState = await Lottery.getRaffleState();
          const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
          console.log("--------", RaffleState);
          console.log("-------", upkeepNeeded);
          assert.equal(upkeepNeeded, false);
          assert.equal(RaffleState.toString(), "1");
        });
        it("returns false if certain time isn't passed", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 5,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if given Time is Passed an people have send Eth and is open", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });
      describe("Perform upkeep function ", function () {
        it("perform upkeep runs only when checkupKeep is true", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await Lottery.performUpkeep("0x");
          //console.log(tx);
          assert(tx);
        });
        it("revert if checkupkeep is false", async function () {
          await expect(Lottery.performUpkeep("0x")).to.be.revertedWith(
            "Lottery__UpKeepNotNeeded"
          );
        });
        it("Updates the raffle state and Emit's and event", async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txresponse = await Lottery.performUpkeep("0x");
          const txreciept = await txresponse.wait(1);
          const RaffleState = await Lottery.getRaffleState();
          const request_Id = txreciept.events[1].args.requestId;
          console.log(JSON.stringify(request_Id));
          assert(RaffleState == 1);
          assert(request_Id.toNumber() > 0);
        });
      });
      describe("Full Fill Random Words", function () {
        beforeEach(async function () {
          await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
        it("Can only be called after perform Upkeep", async function () {
          await expect(
            vrfCoordinatorv2.fulfillRandomWords(0, Lottery.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorv2.fulfillRandomWords(1, Lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });
        it("picks the winner Resets the Lottery and Send Money", async function () {
          const startingAccountIndex = 1; //Since deployer  = 0
          const additionalEntrance = 3;
          const accounts = await ethers.getSigners();
          for (
            let i = startingAccountIndex;
            i < additionalEntrance + startingAccountIndex;
            i++
          ) {
            const accountconnectedtoRaffle = Lottery.connect(accounts[i]);
            await Lottery.EnterLottery({ value: LotteryEntreanceFee });
          }
          const startingTimeStamp = await Lottery.GetLatestTimeStamp();
          await new Promise(async (resolve, reject) => {
            Lottery.once("Recent_winner", async function () {
              console.log("Winner Picked Event Fired");
              try {
                const winner = await Lottery.Get_s_recent_Winner();

                const CurrentTimeStamp = await Lottery.GetLatestTimeStamp();
                const Raffle_state = await Lottery.getRaffleState();
                const GetPlayersarray = await Lottery.GetNoOfPlayers();
                const endingBalance = await accounts[0].getBalance();
                assert(Raffle_state.toString(), "0");
                assert(CurrentTimeStamp > startingTimeStamp);
                assert(GetPlayersarray.toString, "0");
                assert(
                  endingBalance.toString(),
                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    .add(
                      LotteryEntreanceFee.mul(additionalEntrance).add(
                        LotteryEntreanceFee
                      )
                    )
                    .toString()
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            //Kicking Off the event by mocking the chainLink VRF and Keepers
            const tx = await Lottery.performUpkeep([]);
            const txreciept = await tx.wait(1);
            const startingBalance = await accounts[0].getBalance();
            await vrfCoordinatorv2.fulfillRandomWords(
              txreciept.events[1].args.requestId,
              Lottery.address
            );
          });
        });
      });
    });
