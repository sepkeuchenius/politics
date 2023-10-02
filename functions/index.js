const functions = require("firebase-functions");
const { getStorage } = require('firebase-admin/storage');
const algoliasearch = require("algoliasearch");
const client = algoliasearch('PD7R6XVZ97', process.env.ALGOLIA_API_KEY);
const index = client.initIndex('parties');
const { initializeApp } = require('firebase-admin/app');

initializeApp()
const bucket = getStorage().bucket()
exports.search  = functions.runWith({secrets:["ALGOLIA_API_KEY"]}).https.onCall(async (data, context) => {
  return await index.search(data.query).then((res)=>{
    return _generate_parties_overview(res.hits);
  });
});


function _get_unique_elements(list){
  //filter null items and lowercase everything
  const lowercaseItems = list.filter((item) => {return item != null}).map((item) => {return item.toLowerCase()})
  return list.filter((item, index, items) => {return item && lowercaseItems.indexOf(item.toLowerCase()) == index})
}


function _get_root_size(root, hits){
  return (hits.filter((hit) => {return hit.member == root.label || hit.party == root.label}).length / hits.length) * 250
}

function _get_hit_parties(hits){
  var parties = []
  for(hit of hits){
    if(hit.party) {
      parties.push(hit.party)
    }
    else if(hit.parties){
      parties = parties.concat(hit.parties)
    } 
  }
  return _get_unique_elements(parties)
}

function _get_hit_members(hits){
  var members = []
  for(hit of hits){
    members = members.concat(hit.members)
  }
  return _get_unique_elements(members)
}

function _generate_root_node(party, pic_url=null){
  var node = {
    "id": party,
    "label": party,
    "color": "orange", 
    "heightConstraint": {"minimum": 40},
    "widthConstraint": {"minimum": 40},
    "root": true
  }
  if(pic_url){
    node["shape"] = "image";
    node["image"] = pic_url
  }
  return node
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
  return highlightText;
}

function _generate_member_node(member_name){
  return {
    "root": false,
    "id": member_name,
    "label": member_name,
    "heightConstraint": {"minimum": 30},
    "title": member_name,
    "shape": "circle",
    "margin": 10,
    "color": {
      "background": "#FFF9E0",
      "border": "#11999E",
      "highlight": "#11999E"
    },
    "borderWidth": 1
    }
}


async function _generate_parties_overview(hits){
  var nodes = []
  var edges = []
  pics = await bucket.getFiles()
  const parties  = _get_hit_parties(hits)
  console.log(parties)
  for(party_index in parties){
    var party_pic = null
    party = parties[party_index]
    for(pic of pics[0]){
      if(pic.name.toLowerCase().includes(party.toLowerCase())){
        party_pic = pic.publicUrl()
      }
    }
    //find all hits for this party
    party_hits = hits.filter((hit) => {return hit.party == party || (hit.parties && hit.parties.includes(party))})
    root_node = _generate_root_node(party, pic_url = party_pic)
    nodes.push(root_node)
    for(hit of party_hits){
      hit.text = _clean_text(hit.text)
      node = _generate_node(hit)
      if(!nodes.map((node) => {return node.id }).includes(node.id)){
        nodes.push(node)
      }
      edge = {"from": hit.objectID, "to": party}  
      edges.push(edge)
      if(hit.members){
        for(member of hit.members){
          member_node = _generate_member_node(member)
          if(!nodes.map((node) => {return node.id }).includes(member_node.id)){
            nodes.push(member_node)
          }
          if(!edges.map((edge) => {return edge.from + edge.to}).includes(member+hit.objectID)){
            edges.push({"from": member, "to": hit.objectID})
          }
        }
      }
    }
  }
  return [nodes,edges]
}


function _clean_text(str){
  return str.replace(/[^\w\s\.\:\,\;]/gi, '')
}