const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch")
const client = algoliasearch('PD7R6XVZ97', '');
const index = client.initIndex('parties');

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//
 exports.helloWorld = functions.https.onRequest((request, response) => {
   functions.logger.info("Hello logs!", {structuredData: true});
   response.send("Hello from Firebase!");
 });

exports.addMessage = functions.https.onCall((data, context) => {
   return "Ot";
});

exports.search  = functions.https.onCall(async (data, context) => {
    return await index.search(data.query).then((res)=>{
        return res;
    });
});
