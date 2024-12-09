const {
  SQSClient,
  SendMessageCommand,
} = require("@aws-sdk/client-sqs");
const { configObject } = require("./credentials");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const CryptoJS = require("crypto-js");
const config = require("./config.json")
const jwt = require('jsonwebtoken');
const promisify = require('util').promisify;
const randToken = require('rand-token');
const sign = promisify(jwt.sign).bind(jwt);
const verify = promisify(jwt.verify).bind(jwt);

const app = express();

app.use(cors());
app.use(bodyParser.json());

require("dotenv").config();

const SECRET_TOKEN = '12f06cbb4765e70c3ed936ea4bcb519f5b8396107bb7af0958074cf81fe21bed916a0180209280e27028c0396177d4ac474806535d3156967d701f83e665566c'

const sqsClient = new SQSClient(configObject);
const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/474668392244/Victoriaxaoquyet";

const authenticateToken = async (req, res, next) => {
  try {
    // const appId = req.headers["appid"];

    // if (!appId) return res.status(401).json({ msg: "Unauthorize" });
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader?.split(" ")[1];
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

    const verified = await verify(token, accessTokenSecret)

    if (!verified) return res.status(401).json({ msg: "Unauthorize" });

    // const tokenDecode = CryptoJS.AES.decrypt(token, appId).toString(
    //   CryptoJS.enc.Utf8
    // );

    // if (tokenDecode !== SECRET_TOKEN)
    //   return res.status(401).json({ msg: "Unauthorize" });

    next();
  } catch (error) {
    return res.status(401).json({ msg: "Unauthorize" });
  }
};

const decodeToken = async (token, secretKey) => {
	try {
		return await verify(token, secretKey, {
			ignoreExpiration: true,
		});
	} catch (error) {
		console.log(`Error in decode access token: ${error}`);
		return null;
	}
};

const sendMessageToQueue = async (body) => {
  const { message, ...rest } = body;
  const attributes = Object.fromEntries(
    Object.entries(rest?.attributes).map(([k, v], i) => [
      k,
      { DataType: "String", StringValue: rest?.attributes[k] },
    ])
  );

  const command = new SendMessageCommand({
    MessageBody: message,
    QueueUrl: queueUrl,
    MessageAttributes: {
      ...attributes,
    },
  });
  const result = await sqsClient.send(command);
  return result;
};

const generateToken = async (payload, secretSignature, tokenLife) => {
	try {
		return await sign(
			{
				payload,
			},
			secretSignature,
			{
				algorithm: 'HS256',
				expiresIn: tokenLife,
			},
		);
	} catch (error) {
		return null;
	}
};

app.get("/", (_req, res) => {
  res.send("Welcome to Victoria xao quyet sqs API");
});

app.get("/config", (_req, res) => {
  try {
    return res.status(200).json({ config });
  } catch (error) {
    return res.status(500).json(error.message);
  }
})

app.post("/send-message", authenticateToken, async (req, res) => {
  try {
    const result = await sendMessageToQueue(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json(error.message);
  }
});

app.post("/authenticate", async (req, res) => {
  const { appId } = req.body;

  // const accessToken = CryptoJS.AES.encrypt(
  //   SECRET_TOKEN,
  //   appId
  // );
  const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;
	const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

  const dataForAccessToken = {
		appId,
	};

  const accessToken = await generateToken(
		dataForAccessToken,
		accessTokenSecret,
		accessTokenLife,
	);

  const refreshToken = randToken.generate(256)

  return res.status(200).json({ accessToken: accessToken.toString(), refreshToken: refreshToken.toString() });
});


app.post('/refresh', async (req, res) => {
  const {refreshToken} = req.body

  const accessTokenFromHeader = req.headers.authorization.split(" ")[1];

	if (!accessTokenFromHeader) {
		return res.status(400).send('Oh no access token');
	}


  if (!refreshToken) {
		return res.status(400).send('Oh no refresh token');
	}

  const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;

	const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

  const decoded = await decodeToken(
		accessTokenFromHeader,
		accessTokenSecret,
	);


  const appId = decoded.payload.appId; 

  const dataForAccessToken = {
		appId,
	};

  const accessToken = await generateToken(
		dataForAccessToken,
		accessTokenSecret,
		accessTokenLife,
	);

  const newRefreshToken = randToken.generate(256)

  return res.status(200).json({ accessToken: accessToken.toString(),  refreshToken: newRefreshToken.toString()});

})

app.listen(8080, () => {
  console.log("listen");
});

// const pollMessage = async (id) => {
//   console.log("🚀 ~ pollMessage ~ id:", id);
//   try {
//     // const command = new ReceiveMessageCommand({
//     //   MaxNumberOfMessages: 10,
//     //   QueueUrl: queueUrl,
//     //   WaitTimeSeconds: 0,
//     //   MessageAttributeNames: ["All"],
//     //   VisibilityTimeout: 0,
//     // });
//     // const result = await sqsClient.send(command);
//     // console.log("🚀 ~ pollMessage ~ result:", result.Messages);
//     // const messages = result.Messages
//     // console.log("🚀 ~ pollMessage ~ messages:", messages)
//     // const messageId = messages?.find(item => item?.MessageId === id )
//     // console.log("🚀 ~ pollMessage ~ messageId:", messageId)
//     // return messageId
//     //result.Messages[0].ReceiptHandle
//   } catch (error) {
//     console.log("🚀 ~ pollMessage ~ error:", error);
//   }
// };

// const pollMessageReponse = async ({ id }) => {
//   try {
//     const command = new ReceiveMessageCommand({
//       MaxNumberOfMessages: 10,
//       QueueUrl: queueUrl,
//       WaitTimeSeconds: 5,
//       MessageAttributeNames: ["All"],
//     });

//     const result = await sqsClient.send(command);
//     const messages = result.Messages;

//     const messageId = messages?.find(
//       (item) => item?.MessageAttributes.id.StringValue === id
//     );

//     return messageId;
//     //result.Messages[0].ReceiptHandle
//   } catch (error) {
//     console.log("🚀 ~ pollMessage ~ error:", error);
//   }
// };

// const deleteMessgeFromQueue = async (id) => {
//   try {
//     const message = await pollMessage(id);
//     console.log("🚀 ~ deleteMessgeFromQueue ~ message:", message);
//     // const data = await sqsClient.send(
//     //   new DeleteMessageCommand({
//     //     QueueUrl: queueUrl,
//     //     ReceiptHandle: ReceiptHandle,
//     //   })
//     // );
//   } catch (error) {}
// };

// app.get("/get-message", async (req, res) => {
//   const { id } = req.query;
//   try {
//     const result = await pollMessage(id);
//     return res.status(200).json(result);
//   } catch (error) {
//     return res.status(500).json(error.message);
//   }
// });

// app.post("/delete-message", async (req, res) => {
//   const { id } = req.body;
//   try {
//     const result = await deleteMessgeFromQueue(id);
//     return res.status(200).json(result);
//   } catch (error) {
//     return res.status(500).json(error.message);
//   }
// });

// app.get("/get-message-response", async (req, res) => {
//   const id = req.query;
//   try {
//     const result = await pollMessageReponse(id);
//     return res.status(200).json(result);
//   } catch (error) {
//     return res.status(500).json(error.message);
//   }
// });


