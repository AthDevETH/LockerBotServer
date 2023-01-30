## Locker Bot API Documentation v0.1

-- REST API 

- DISCLAIMER!! USE AT YOUR OWN RISK! THIS SOFTWARE MAY PURCHASE TOKENS THAT ARE COUNTERFEIT/FRAUDULENT AND RESULT IN FINANCIAL LOSS. SOFTWARE AUTHOR IS NOT RESPONSIBLE FOR FINANCIAL LOSS THAT MAY OCCUR DUE TO MALFUNCTION OR PURCHASE OF ASSETS RESULTING IN LOSS OF VALUE.

# Locker Bot Overview
- This system contains scripts which monitor liquidity locking contracts (unicrypt and Team Finance) for liquidity tokens that are locked. The bot will first ensure that the pair contains a blue-chip token (wETH, USDC, DAI, or USDT), then purchase some amount of the non-payment token. The script then monitors the pair for price increases and sells a desired percentage of held tokens at specified price-increase intervals.

- Upon successful purchase, the bot will monitor the pair for price increases. The frequency of price checks, as well as the number of cycles of checks prior to termination of monitoring are configurable.

- The REST api contains the ability to configure various variable, as well as display trade/interaction history

- WARNING!! This script currently only supports WETH for purchases and not the native ETH token. Please wrap ETH into wETH before running this script.

# Authentication
- provided via auth0
- all endpoints protected by Authentication
- add key to header in the form:
headers: {authorization: 'Bearer YOUR_ACCESS_TOKEN_HERE'}

# BASE endpoint:
https://

# GET endpoints

1. "/info/purchaseAmounts"
- params: none
- data: none
- returns currently set purchase amounts for pairs containing ETH, USDC, USDT, and DAI

2. "/info/monitorDetails"
- params: none
- data: none
- returns the following: 
    - current % of tokens to sell
    - target price multiplier (bot sells when price hits this multiplier)
    - interval (how often does the monitor check price)
    - cycles to timeout: how many monitoring cycles pass until the monitor stops tracking pair

3. "/info/pairToggles"
- params: none
- data: none
- returns status on which blue-chip tokens will be used.
    - True means pairs with given blue-chip will be purchase and monitored
    - False means pairs with given blue-chip will be ignored.

4. "/info/publicKey"
- params: none
- data: none
- returns current public key being used

5. "/pairData" 
- params: none
- data: none
- returns list of all current and previously tracked pairs. Includes the following:
{
    "user": address of user,
    "pair": address of liquidity pool tracked,
    "path": [token0, token1], // addresses of both tokens in pool
    "tokensBought": amount of tokens purchased
    "purchaseAmt": amount of blue chip token used to purchase
    "type": name of blue chip token
    "amountSold": amount of token that was sold (0 before sale completes) 
    "profit": amount received from sale of token
    "tx": [purchaseID, saleID] // transaction IDs of purchase/sale TX's
  },

## POST endpoints

1. "/approve"
- params: none
- data: none
- Approves WETH, USDC, USDT, and DAI for consumption by uniswap V2 router
- This must be called for swaps to work
- RPC and privateKey must be written to the DB first (see endpoints below)

2. "/start"
- params: none
- data: must provide following JSON {
    startUnicrypt: bool,
    startTeamFin: bool,
    resume: bool
}
- This endpoint starts the scripts. The three toggles in the JSON determine which parts to run.
- startUnicrypt and startTeamFin subscribes to locker contract events
- "resume" begins monitoring for any pairs in the DB that have not yet been sold. Does nothing if db is empty
- an RPC must be provided to the db first.

3. "/stop"
- params: none
- data: must provide following JSON {
    stopUnicrypt: bool,
    stopTeamFin: bool,
    stopPairMonitors: bool
}
- This endpoint stops the scripts. The three toggles in the JSON determine which parts to stop.
- "stopUnicrypt" and "stopTeamFin" will clear subscriptions if flag is true.
- "stopPairMonitors" will stop all pair monitors

4. "/keys/addPrivateKey"
- params: none
- data: must provide following JSON {
    privateKey: hex string
}
- stores private key and public key
- clears all event subscriptions and monitors.
- must restart scripts with "/start" after editing private key.
- returns public key

5. "/keys/addRPC"
- params: none
- data: must provide the following JSON {
    rpc: string
}
- RPC address must be a websocket for event subscriptions to work
- clears all existing subscriptions
- must restart scripts with "/start" after updating RPC

6. "/clearDB"
- params: none
- data: none
- Clears the list of all pair information. 
- Use at your own risk

7. "/configure/setBuyAmounts" 
- params: none
- data: must provide following JSON {
    eth: number 
    usdc: number
    usdt: number
    dai: number
}
- do not account for decimals here, they are added later.
- supports float and int values
- sets the purchase amount for each blue-chip
- value of zero results in no-change in db

8. "/configure/timerLength/:length"
- params: length - integer (in seconds)
- data: none
- sets the number of seconds the monitor will wait to take a price reading
- value must be > 0

9. "/configure/timeoutCycles/:cycles"
- params: cycles - integer
- data: none
- sets the number of cycles the monitor will complete before it stops
- value must be > 0

10. "/configure/multiplier/:multiplier" 
- params: multiplier - int or float > 1
- data: none
- sets the desired target multiplier for when bot sells tokens
- supports integer and float.

11. "/configure/percentToSell"
- params: percent - integer only. must be greater than 0, and less than or equal to 100
- data: none
- sets the percentage of tokens to sell upon price reaching multiplier target.

12. "/toggle/Eth"
- params: none
- data: none
- flips the flag to enable/disable tracking of eth pairs

13. "/toggle/Usdc"
- params: none
- data: none
- flips the flag to enable/disable tracking of usdc pairs

14. "/toggle/Usdt"
- params: none
- data: none
- flips the flag to enable/disable tracking of usdt pairs

15. "/toggle/Dai"
- params: none
- data: none
- flips the flag to enable/disable tracking of dai pairs