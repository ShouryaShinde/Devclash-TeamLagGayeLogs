import axios from "axios";

export default async function getAccessToken() {
  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ACCOUNT_ID}`,
    null,
    {
      auth: {
        username: process.env.CLIENT_ID,
        password: process.env.CLIENT_SECRET,
      },
    }
  );

  return res.data.access_token;
}