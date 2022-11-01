const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit tests", async function () {
          let raffle, vrfCoordinatorV2Mock, raffleEnteranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEnteranceFee = await raffle.getEnteranceFee()
              interval = await await raffle.getInterval()
          })

          describe("constructor", async function () {
              it("initializes the raffle correctly", async function () {
                  // ideally we make our tests have just 1 asset per "it"
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", async function () {
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
                      rafflem,
                      "RaffleEnter"
                  )
              })
              it("doesnt alow enternce when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEnteranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  //we pretend to be the chainlink keeper
                  await raffle.performUpkeep([])
                  await expect(
                      raffle.enterRaffle({ value: raffleEnteranceFee })
                  ).to.be.revertedWith("Raffle__NotOpen")
              })
          })
      })
