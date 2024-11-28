const {SQS} = require("@aws-sdk/client-sqs")
require('dotenv').config()

const awsSendMessage = async (sqs, params) => {
    try {
        const data = await sqs.sendMessage(params)
        return data
    } catch (error) {
        console.log("🚀 ~ awsSendMessage ~ error:", error)
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

    const params = {
        MessageBody: JSON.stringify({'message' : 'Hello', 'from': "@VictoriaXaoQuyet"}),
        QueueURL: process.env.QUEUE_URL
    }
    const response = await awsSendMessage(sqs.params)
    console.log("🚀 ~ response:", response)
})