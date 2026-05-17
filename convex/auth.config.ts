// Tells Convex which JWT issuer to trust — required by @convex-dev/auth.
// CONVEX_SITE_URL is set automatically by the Convex deployment.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
