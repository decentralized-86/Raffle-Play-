const { getNamedAccounts, deployments, network, ethers } = require("hardhat");
const {
  developmentchains,
  networkconfig,
} = require("../helper-hardhat.config");
const { verify } = require("../utils/verify");
require("dotenv").config();
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const SUB_KEY_AMOUNT = ethers.utils.parseEther("30");
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorv2address, subscriptionId;
  const entranceFee = networkconfig[chainId]["entranceFee"];
  const gasLane = networkconfig[chainId]["gasLane"];
  subscriptionId = networkconfig[chainId]["subscriptionId"];
  const callbackGasLimit = networkconfig[chainId]["callbackGasLimit"];
  const interval = networkconfig[chainId]["interval"];
  if (developmentchains.includes(network.name)) {
    const vrfCoordinatorv2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorv2address = vrfCoordinatorv2Mock.address;
    const transactionResponse = await vrfCoordinatorv2Mock.createSubscription();
    const transactionReciept = await transactionResponse.wait(1);
    subscriptionId = transactionReciept.events[0].args.subId;
    //Fund The Subscription
    // Usually You Dont need a Link Token on a real network
    await vrfCoordinatorv2Mock.fundSubscription(subscriptionId, SUB_KEY_AMOUNT);
  } else {
    vrfCoordinatorv2address = networkconfig[chainId]["vrfCoordinatorv2"];
  }
  const args = [
    vrfCoordinatorv2address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  console.log(vrfCoordinatorv2address);
  console.log(gasLane);
  console.log(entranceFee);
  console.log(subscriptionId);
  console.log(callbackGasLimit);
  console.log(interval);

  const Lottery = await deploy("Lottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  //Verify the Contract
  if (!developmentchains.includes(network.name) && ETHERSCAN_API_KEY) {
    log("Verifying........");
    await verify(Lottery.address, [
      vrfCoordinatorv2address,
      entranceFee,
      gasLane,
      subscriptionId,
      callbackGasLimit,
      interval,
    ]);
  }
};

module.exports.tags = ["all", "LOTTERY"];
