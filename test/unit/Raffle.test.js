const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit tests", function () {
          let raffle, vrfCoordinatorV2Mock, raffleEnteranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              //   const subscriptionId = raffle.getSubscriptionId()
              //   await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
              raffleEnteranceFee = await raffle.getEnteranceFee()
              interval = await await raffle.getInterval()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async function () {
                  // ideally we make our tests have just 1 asset per "it"
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", function () {
              it("reverts if you dont pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  )
              })
              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEnteranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              //   it("doesnt alow enternce when raffle is calculating", async () => {
              //       await raffle.enterRaffle({ value: raffleEnteranceFee })
              //       await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              //       await network.provider.send("evm_mine", [])
              //       //we pretend to be the chainlink keeper
              //       await raffle.performUpkeep([])
              //       await expect(
              //           raffle.enterRaffle({ value: raffleEnteranceFee })
              //       ).to.be.revertedWith("Raffle__NotOpen")
              //   })
          })
          describe("checkUpkeep", () => {
              it("returns false if people havent sent any eth", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              //   it("returns false if rasffle isnt oppen", async () => {
              //       await raffle.enterRaffle({ value: raffleEnteranceFee })
              //       await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              //       await network.provider.send("evm_mine", [])
              //       await raffle.performUpkeep([])
              //       const raffleState = await raffle.getRaffleState()
              //       const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
              //       assert.equal(raffleState.toString(), "1")
              //       assert.equal(upkeepNeeded, false)
              //   })
          })
          describe("perform upkeep", () => {
              it("can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEnteranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })
              it("reverts when checkupkeep is flase", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("updates the raffle state, emits and event and callse the vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEnteranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toNumber() == 1)
              })
          })
          describe("fulfullRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEnteranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfullRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistant request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfullRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistant request")
              })
              //wayyyy to big
              it("picks a winner, resets the lottery and send the money", async () => {})
          })
      })
