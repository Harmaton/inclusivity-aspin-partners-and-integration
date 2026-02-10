export default () => ({
  aspin: {
    clientId: process.env.ASPIN_CLIENT_ID,
    clientSecret: process.env.ASPIN_CLIENT_SECRET,
    partnerGuid: process.env.ASPIN_PARTNER_GUID,
    authUsername: process.env.ASPIN_AUTH_USERNAME,
    authPassword: process.env.ASPIN_AUTH_PASSWORD,
    basicAuthToken: process.env.ASPIN_BASIC_AUTH_TOKEN,
    partnerName: process.env.PARTNER_NAME,
    baseUrl: process.env.BASE_URL,
  },
});
