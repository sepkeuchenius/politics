const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch");
const client = algoliasearch('PD7R6XVZ97', process.env.ALGOLIA_API_KEY);
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

exports.search  = functions.runWith({secrets:["ALGOLIA_API_KEY"]}).https.onCall(async (data, context) => {
  return await index.search(data.query).then((res)=>{
    return generate_graph_from_hits(res.hits);
  });
});


function _get_hit_parties(hits){
  return hits.map(function(hit){return hit.party}).filter(function(party, index, parties){return parties.indexOf(party) == index})
}

function _generate_party_node(party, index){
  return {
    "id": index,
    "label": party,
    "color": "orange", 
    "size": 50, 
    "heightConstraint": {"minimum": 50},
    "widthConstraint": {"minimum": 50}
  }
}

function _generate_node(hit){
  return {
    "id": hit.objectID,
    "label": _find_highlight(hit).substring(0, 10) + "...",
    "heightConstraint": {"minimum": 30},
    "title": _find_highlight(hit),
  }
}

function generate_graph_from_hits(hits){
  var nodes = []
  var edges = []
  var hits = hits.filter(_find_highlight)
  var parties = _get_hit_parties(hits)
  var party_nodes = parties.map(_generate_party_node)
  nodes = nodes.concat(party_nodes)
  for(hit of hits){
    node = _generate_node(hit)
    nodes.push(node)
    edge = {"from": hit.objectID, "to": parties.indexOf(hit.party)}
    edges.push(edge)
  }
  return [nodes, edges]
}

function _find_highlight(hit){
  var text = hit.text
  var highlightText  = hit._highlightResult.text
  if(highlightText){
      highlightText = highlightText.value
  }
  else{
      return false
  }
  var highLightSentences = highlightText.split(".")
  for(sentence of highLightSentences){
      if(sentence.includes("<em>")){
          var filteredSentence = sentence.replace("<em>", "").replace("</em>", "")
          return filteredSentence
      }
  }
}
