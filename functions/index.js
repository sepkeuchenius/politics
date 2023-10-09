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
  var hits_per_party = {}
  var pics_per_party = {}
  var total_hits = 0
  pics = await bucket.getFiles()
  const parties  = _get_hit_parties(hits)
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
    hits_per_party[party] = party_hits
    pics_per_party[party] = party_pic
    total_hits += party_hits.length
  }
  return [hits_per_party, pics_per_party, total_hits]
}


function _clean_text(str){
  return str.replace(/[^\w\s\.\:\,\;]/gi, '')
}