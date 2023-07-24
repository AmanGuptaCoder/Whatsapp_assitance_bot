const production = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
};

const development = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
     PORT: '5000',
     Meta_WA_VerifyToken: '1234',
     Meta_WA_accessToken: 'EAARwbQ84G4YBAOZAJRFKSpF75ZCTwW7r5kbHLmJZCXRBsQ8XUbWPKZA5wIKTeddU0xPSLqXhbS8LOnjd9ZBIJZCInnfZBogZBtTXuVDZBg1cniW4izvTupDRI7ZAoMwgF2k9kEyqGf7egikCOBjSWvfHU3yzDjn0lgUrFwLFvVlwDOMcvZAaRxXUgVTubzLFABVsZCBOABFl2WMrjS9AkfBFvP86',
     Meta_WA_SenderPhoneNumberId: '112212585279143',
     Meta_WA_wabaId: '108073605700285',
};

const fallback = {
    ...process.env,
    NODE_ENV: undefined,
};

module.exports = (environment) => {
    console.log(`Execution environment selected is: "${environment}"`);
    if (environment === 'production') {
        return production;
    } else if (environment === 'development') {
        return development;
    } else {
        return fallback;
    }
};