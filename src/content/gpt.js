import Bottleneck from "bottleneck";
import {Configuration, OpenAIApi} from "openai";


export {enqueueRequest, totalTokens, limiter}

let totalTokens = 0;

async function checkVideo(data) {
  let title = data["title"];
  let theme = data["theme"];

  let content = await gptFilter(title, theme);
  content = JSON.parse(content.content)
  // console.log(content.response, title.slice(0,40));
  return content.response
  // return Math.random() < 0.1;
  // return false;
}

async function gptFilter(description, theme) {
  try {
    const chatCompletion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "As an AI YouTube assistant, your task is based on the YouTube video description we provide and the category we designate. Determine if the video matches the provided category. If the description aligns, issue a response in JSON format as {\"response\": true}, and if not, respond with {\"response\": false}.\n",
        },
        {role: "user", content: `Here is your first task \n Description: ${description} \n Category: ${theme}`},
      ],

    });

    totalTokens += chatCompletion.data.usage.total_tokens;

    return chatCompletion.data.choices[0].message;

  } catch (error) {
    console.error("Error:", error);
  }
}

// Create a new limiter with a limit of 200 requests per minute
const limiter = new Bottleneck({
  minTime: (60 * 1000) / 3500, // 60,000 ms in a minute divided by 200 RPM
});

// Set the OpenAI API
let configuration = new Configuration({
  apiKey: "",
});

delete configuration.baseOptions.headers['User-Agent'];
const openai = new OpenAIApi(configuration);

// A wrapper function to handle retries and errors
async function makeRequestWithRetries(data, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await checkVideo(data);
    } catch (error) {
      retries++;
      console.error(`Request failed: ${error}. Retrying... (${retries}/${maxRetries})`);
      // Exponential backoff delay before retrying the request
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
  throw new Error(`Request failed after ${maxRetries} retries`);
}

// The enqueue function that schedules a request using the limiter
function enqueueRequest(data) {
  // console.log("added to queue", data);
  return limiter.schedule(() => makeRequestWithRetries(data));
}
