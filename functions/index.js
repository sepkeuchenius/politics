const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch");
const { object } = require("firebase-functions/v1/storage");
const client = algoliasearch('PD7R6XVZ97', process.env.ALGOLIA_API_KEY);
const index = client.initIndex('parties');

exports.search  = functions.runWith({secrets:["ALGOLIA_API_KEY"]}).https.onCall(async (data, context) => {
  return await index.search(data.query).then((res)=>{
    return generate_graph_from_hits(res.hits);
  });
});

function _get_root_size(root, hits){
  return (hits.filter((hit) => {return hit.member == root.label || hit.party == root.label}).length / hits.length) * 250
}

function _get_hit_parties(hits){
  return hits.map(function(hit){return hit.party}).filter(function(party, index, parties){return party && parties.indexOf(party) == index})
}

function _get_hit_members(hits){
  return hits.map(function(hit){return hit.member}).filter(function(member, index, members){return member && members.indexOf(member) == index})
}

function _generate_root_node(party, index){
  return {
    "id": index,
    "label": party,
    "color": "orange", 
    "heightConstraint": {"minimum": 40},
    "widthConstraint": {"minimum": 40},
    "root": true
  }
}

function _generate_node(hit){
  return {
    "root": false,
    "id": hit.objectID,
    "label": _find_highlight(hit).substring(0, 10) + "...",
    "heightConstraint": {"minimum": 30},
    "title": hit.text,
    "shape": "box",
    "margin": 10,
    "color": {
      "background": "#F4F4F4",
      "border": "#11999E",
      "highlight": "#11999E"
    },
    "borderWidth": 1
    }
}

function generate_graph_from_hits(hits){
  var nodes = []
  var edges = []
  var hits = hits.filter(_find_highlight)
  var roots = _get_hit_parties(hits).concat(_get_hit_members(hits))
  var root_nodes = roots.map(_generate_root_node)
  root_nodes.forEach(root => {
    root.heightConstraint.minimum = Math.max(root.heightConstraint.minimum, _get_root_size(root, hits))
    root.gravity = _get_root_size(root, hits) / 250
    root.widthConstraint.minimum = Math.max(root.heightConstraint.minimum, _get_root_size(root, hits))
  })
  nodes = nodes.concat(root_nodes)
  for(hit of hits){
    hit.text = _clean_text(hit.text)
    node = _generate_node(hit)
    nodes.push(node)
    if (hit.hasOwnProperty("party")){
      edge = {"from": hit.objectID, "to": roots.indexOf(hit.party)}
    }
    else {
      edge = {"from": hit.objectID, "to": roots.indexOf(hit.member)}

    }
    edges.push(edge)
  }
  return [nodes, edges]
}

function _find_highlight(hit){
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
        var filteredSentence = sentence
        while(filteredSentence.includes("<em>")){     
          filteredSentence = filteredSentence.replace("<em>", "").replace("</em>", "")
        }
        return _clean_text(filteredSentence)
    }
  }
}

function _clean_text(str){
  return str.replace(/[^\w\s\.\:\,\;]/gi, '')
}