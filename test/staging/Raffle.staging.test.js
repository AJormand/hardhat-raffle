const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit tests", function () {
          let raffle, raffleEnteranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEnteranceFee = await raffle.getEnteranceFee()
          })

          describe("fulfill randolmWords", () => {
              it("works with live ChainLink keepers and VRF, we get a random winner", async () => {
                  //enter the raffle
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  //setup the listsener before enteroing the raffle
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("winner poicked event fired")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert
                                  .equal(
                                      winnerEndingBalance.toString(),
                                      winnerStartingBalance.add(raffleEnteranceFee)
                                  )
                                  .toString()
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (err) {
                              console.log(err)
                              reject(e)
                          }
                      })
                      //entering the raffle
                      await raffle.enterRaffle({ value: raffleEnteranceFee })
                      const winnerStartingBalance = await accounts[0].getBalance()

                      //this code wont complete until our listener has finished listening
                  })
              })
          })
      })

//process:
//1) get our subId for chainlink VRF
//2) deploy our contract using the subID
//3) Register the contract with Chainlink VRF & its subID
//4) register the contract with Chainlink Keepers
//5) run staging tests
