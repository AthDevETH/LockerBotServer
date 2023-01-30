const events = require('./services/events')

const initResult = (success) => new Promise((resolve, reject) => {
    if (success) {
        return resolve('initiated')
    }

    return reject({ error: 'failed' })
})

const main = async () => {
    events.subscribe('init', async () => {
        const result = await initResult(true);
        console.log(`SUBSCRIBE RESULT: ${result}`)

        return result;
    });

    try {
        const response = await events.publishSync('init');
        events.publish('init');
        console.log(`PUBLISH SYNC RESPONSE: ${response}`)
    } catch (err) {
        console.log('ERROR')
        console.log(err)
    }
}

main()