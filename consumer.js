const {SQS} = require('@aws-sdk/client-sqs')
require('dotenv').config()

const awsSQSConsumber = async (sqs, queueUrl) => {
    while(true){
        try {
            const {Messages} =  await sqs.receiveMessage({
                QueueUrl: queueUrl,
                MaxNumberOfMessage: 1,
                WaitTimeSeconds: 10
            })

            if(!Messages) continue
            console.log("🚀 ~ awsSQSConsumber ~ Messages:", Messages)
            
        } catch (error) {
            console.log("🚀 ~ awsSQSConsumber ~ error:", error)
        }
    }
}

(async() => {
    const sqs = new SQS({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.AWS_KEY,
            secretAccessKey: process.env.AWS_SECRET,
        }
    })
    
    await awsSQSConsumber(sqs, process.env.QUEUE_URL)
})