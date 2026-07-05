const TOKEN = "EAAY6znZAJXKMBRx4aIpvBXkYtWtyoeLUBJhEqkiBiaZCwFC0GpEjOdSieNOK6WZAYIxeq5ZCuRAQl6t3ha0NHgrZA8mze4mygXqTBPvf37byYuUZAS0rZCqhDfZBc6DZAUSWJFkttDwlxUvlAmYZANpyNaD8TVAqsK8VsCaeSE3C5jb3Y0FViPSV2ZAQ1TkN1BAmiEGxiS7fCZCZAAe282siKZCGZAhQYvJAV2jS0QZAhimOInLn";
const WABA_ID = "1375718651142796";

async function main() {
  const url = `https://graph.facebook.com/v19.0/${WABA_ID}/message_templates?fields=name,status,language,category,components&access_token=${TOKEN}`;

  try {
    console.log("Listing templates...");
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error listing templates:", err);
  }
}

main();
