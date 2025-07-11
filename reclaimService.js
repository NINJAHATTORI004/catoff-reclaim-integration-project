// services/reclaimService.js

const { Reclaim } = require('@reclaimprotocol/js-sdk');
const { RECLAIM_PROVIDER_ID, RECLAIM_APP_ID } = require('../utils/constants');
const { processSampleData } = require('./sampleService');
const { processNewIntegrationData } = require('./newIntegrationService');
const { processGamingAchievementsData } = require('./gamingAchievementsService');  // Add this line

exports.signWithProviderID = async (userId, challengeId, providerId) => {
  const providerName = RECLAIM_PROVIDER_ID[providerId];
  const reclaimAppID = RECLAIM_APP_ID[providerName];
  const reclaimAppSecret = process.env[`${providerName}_SECRET`];

  console.log(`Sending signature request to Reclaim for userId: ${userId} with providerName: ${providerName}`);

  try {
    const reclaimClient = new Reclaim.ProofRequest(reclaimAppID);
    await reclaimClient.buildProofRequest(providerId);
    reclaimClient.setSignature(await reclaimClient.generateSignature(reclaimAppSecret));
    const { requestUrl: signedUrl } = await reclaimClient.createVerificationRequest();

    await handleReclaimSession(userId, reclaimClient, providerName);
    return signedUrl;
  } catch (error) {
    console.error(`Failed to process Reclaim request for userId: ${userId}`, error);
    throw error;
  }
};

const handleReclaimSession = async (userId, reclaimClient, providerName) => {
  await reclaimClient.startSession({
    onSuccessCallback: async proof => {
      console.log(`Successful reclaim callback with proof: ${JSON.stringify(proof)}`);

      try {
        let processedData;
        switch (providerName) {
          case 'SAMPLE_SERVICE':
            processedData = await processSampleData(proof, providerName);
            break;
          case 'NEW_INTEGRATION_SERVICE':
            processedData = await processNewIntegrationData(proof, providerName);
            break;
          case 'GAMING_ACHIEVEMENTS_SERVICE':  // Add this case
            processedData = await processGamingAchievementsData(proof, providerName);
            break;
          default:
            throw new Error(`No handler for provider: ${providerName}`);
        }

        console.log(`Processed data: ${JSON.stringify(processedData)}`);
      } catch (error) {
        console.error(`Failed to process Reclaim proof for userId: ${userId}`, error);
      }
    },
    onFailureCallback: error => {
      console.error(`Verification failed for userId: ${userId}`, error);
    },
  });
};
