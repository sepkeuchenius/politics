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

const PARTY_MAPPER = {
  "OMTZIGT": "NSC",
  // "PVDA": "GL-PvdA",
  // "GROENLINKS": "GL-PvdA",
  // "GL": "GL-PvdA",
  "BBB": "BBB",
  "VVD": "VVD",
  "PVDD": "PvdD",
  "D66": "D66",
  "VAN HAGA": "BVNL",
  "GROEP VAN HAGA": "BVNL",
  "KROL": "BVNL",
  "VAN KOOTEN-ARISSEN": "SPLINTER",
  "GÜNDOGAN": "GUNDOGAN"
}

function mapParty(party){
  if(!party || party.includes(".")){
    return null
  }
  if(Object.keys(PARTY_MAPPER).includes(party.toUpperCase())){
    return PARTY_MAPPER[party.toUpperCase()]
  }
  else {
    return party.toUpperCase()
  }
}


function _get_unique_elements(list){
  //filter null items and lowercase everything
  return list.filter((item, index, items) => {return item && items.indexOf(item) == index})
}


function _get_hit_parties(hits){
  var parties = []
  for(hit of hits){
    if(hit.party) {
      if(mapParty(hit.party)){
        parties.push(hit.party)        
      }
    }
    else if(hit.parties){
      parties = parties.concat(hit.parties)
    } 
  }
  //we now have a list of parties of all the hits, so we can calc their occurances
  var party_occurances = {}
  for(var party of parties){
    if(!party_occurances[party]){
      party_occurances[party] = 1
    }
    else{
      party_occurances[party] += 1
    }
  }
  //make into tuples
  var party_occurance_tuples = []
  for(party in party_occurances){
    party_occurance_tuples.push([party, party_occurances[party]])
  }

  //sort by occurance
  party_occurance_tuples.sort((a,b)=>{return b[1] - a[1]});

  //return the sorted parties
  return party_occurance_tuples;
}


function _get_all_parties(docs){
  var parties = []
  for(doc of docs){
    if(doc.party){
      parties.push(doc.party)
    }
    if(doc.parties){
      parties = parties.concat(doc.parties)
    } 
    if(doc.votes_for){
      parties = parties.concat(doc.votes_for.map((vote)=>{return vote.ActorFractie}))
    } 
    if(doc.votes_against){
      parties = parties.concat(doc.votes_against.map((vote)=>{return vote.ActorFractie}))
    }
  }

  return _get_unique_elements(parties)
}


async function _generate_parties_overview(hits){
  var motionParties = []
  for(var hit of hits){
    if(hit.party){
      hit.party = mapParty(hit.party)
    }
    else if(hit.parties){
      hit.parties = _get_unique_elements(hit.parties.map((party)=>{return mapParty(party)}))
      motionParties = motionParties.concat(hit.parties)
    }
    if(hit.votes_for && hit.votes_for.length > 0){
      hit.votes_for = _get_unique_elements(hit.votes_for.map((vote)=>{vote.ActorFractie = mapParty(vote.ActorFractie); return vote}))
      hit.total_votes_for = hit.votes_for.map((vote)=>{return vote.FractieGrootte}).reduce((total, n)=>{return total + n})
      motionParties = motionParties.concat(hit.votes_for.map((vote)=>{return vote.ActorFractie}))
    }
    if(hit.votes_against && hit.votes_against.length > 0){
      hit.votes_against = _get_unique_elements(hit.votes_against.map((vote)=>{vote.ActorFractie = mapParty(vote.ActorFractie); return vote}))
      hit.total_votes_against = hit.votes_against.map((vote)=>{return vote.FractieGrootte}).reduce((total, n)=>{return total + n})
      motionParties = motionParties.concat(hit.votes_against.map((vote)=>{return vote.ActorFractie}))
    }
  }
  motionParties = _get_unique_elements(motionParties)
  var pics_per_party = {}
  var total_hits = 0
  pics = await bucket.getFiles()
  const allParties = _get_all_parties(hits)
  for(var party of allParties){
    for(pic of pics[0]){
      if(pic.name.toLowerCase().split(".")[0]==party.toLowerCase()){
        party_pic = pic.publicUrl()
        pics_per_party[party] = party_pic
      }
    }
  }
  const motions = hits.filter((hit)=>{return hit.members})
  const party_occurance_tuples  = _get_hit_parties(hits)  
  for(party_index in party_occurance_tuples){
    var party_pic = null
    party = party_occurance_tuples[party_index][0]
    party_hits = hits.filter((hit) => {return hit.party == party || (hit.parties && hit.parties.includes(party))})
    total_hits += party_hits.length
  }

  return {
    all_hits: hits, 
    pics_per_party: pics_per_party, 
    n_hits: total_hits, 
    all_party_occurance_tuples: party_occurance_tuples, 
    motion_party_occurance_tuples: _merge_tuple_lists(party_occurance_tuples, _get_hit_parties(motions)), 
    program_party_occurance_tuples: _merge_tuple_lists(party_occurance_tuples, _get_hit_parties(hits.filter((hit)=>{return !hit.members}))), 
    party_overlaps:  _get_overlapping_parties(motions, motionParties), 
    biggest_blocking_party: _get_biggest_blocker(motions, motionParties), 
    biggest_fan_party: _get_biggest_fan(motions, motionParties),
    most_active_party: _get_most_active_party(motions, motionParties), 
    most_cooperating_parties: _get_cooperating_parties_in_motions(motions, motionParties)[0], 
  }
}


function _get_party_stance(motion, party){
  if(motion.parties.includes(party)){
    return 1
  }
  else if(motion.votes_for.map((vote)=>{return vote.ActorFractie}).includes(party)){
    return 0;
  }
  else {
    return -1
  }
}


function _get_party_agreement_distance(motion, partyX, partyY){
  const partyXStance = _get_party_stance(motion, partyX)
  const partyYStance = _get_party_stance(motion, partyY)
  return Math.abs(partyXStance - partyYStance) // get distance
}
//samenwerking: meest gecombineerde motie indieners
//tegenwerking: meest geblokkeerde moties
//meewerking: meest geaccepteerde motie waar niet aan is megedaan
//tegenstellend: meeste afstand
//ijverig: meest ingediende moties

function _get_cooperating_parties_in_motions(motions, parties){
  var counter = {}
  for(motion of motions){
    for(party of motion.parties){
      for(cooperatingParty of motion.parties.filter((coParty)=>{return party != coParty})){
        combo = [party, cooperatingParty].sort()
        firstKey = combo[0]
        secondKey = combo[1]
        if(!counter[firstKey]){
          counter[firstKey] = {}
        }
        if(!counter[firstKey][secondKey]){
          counter[firstKey][secondKey] = 1
        }
        else{
          counter[firstKey][secondKey] += 1
        }
      }
    }
  }
  var tuple_list = [] 
  for(firstKey in counter){
    for(secondKey in counter[firstKey]){
      tuple_list.push([firstKey, secondKey, counter[firstKey][secondKey]])
    }
  }
  tuple_list.sort((a,b)=>{return b[2] - a[2]})
  return tuple_list
}


function _count_parties_actions_in_motions(motions, parties, get_action_function){
  var counter = parties.map((party) => {return [party, 0]})
  for(motion of motions){
    const parties_against = get_action_function(motion)
    console.log(parties_against)
    for(party of parties_against){
      for(party_count of counter){
        if(party_count[0] == party){
          party_count[1] += 1
          break
        }
      }
    }
  }
  console.log(counter)
  counter.sort((a,b)=>{return b[1] - a[1]});
  if(counter.length > 1 && counter[0][1] == counter[1][1]){
    counter[0][0] = `(oa) ${counter[0][0]}`
  }
  console.log(counter, get_action_function)
  return counter
}


function _get_motion_votes_for(motion){
  return motion.votes_for.map((vote)=>{return vote.ActorFractie})
}


function _get_motion_votes_againts(motion){
  return motion.votes_against.map((vote)=>{return vote.ActorFractie})
}


function _get_motion_parties(motion){
  return motion.parties
}


function _get_most_active_party(motions, parties){
  return _count_parties_actions_in_motions(motions, parties, _get_motion_parties)[0]
}

function _get_biggest_blocker(motions, parties){
  return _count_parties_actions_in_motions(motions, parties, _get_motion_votes_againts)[0]
}

function _get_biggest_fan(motions, parties){
  return _count_parties_actions_in_motions(motions, parties, _get_motion_votes_for)[0]
}


function _get_overlapping_parties(motions, parties){
  //calculate the overlap between parties
  console.log(parties)
  var overlaps = {}
  const maxDistance = motions.length * 2;
  for(motion of motions){
    for(party of parties){
      if(!overlaps[party]){
        overlaps[party] = {}
      }
      for(otherParty of parties){
        if(party == otherParty){
          continue
        }
        if(overlaps[otherParty] && overlaps[otherParty][party]){
          //dont do double work
          continue
        }
        var agreementDistance = _get_party_agreement_distance(motion, party, otherParty);
        if(!overlaps[party][otherParty]){
          overlaps[party][otherParty] = maxDistance;
        }
        overlaps[party][otherParty] -= agreementDistance;
      } 
    }
  }
  // all overlaps are now between 0 and maxDistance
  // the higher the number, the better the match
  
  // find best and worst matches

  console.log(overlaps)

  var bestScore = 0;
  var worstScore = maxDistance;

  var bestTuple = []
  var worstTuple = []
  for(party in overlaps){
    for(otherParty in overlaps){
      if(overlaps[party][otherParty] > bestScore){
        bestScore = overlaps[party][otherParty]
        bestTuple = [party, otherParty]
      }
      if(overlaps[party][otherParty] < worstScore){
        worstScore = overlaps[party][otherParty]
        worstTuple = [party, otherParty]
      }
    }
  }
  if(bestTuple.length < 2){
    return []
  }
  // transform to venn
  var vennData = []
  for(party of worstTuple){
    vennData.push({
      x: party,
      value: maxDistance,
      name: party,
    })
  }

  vennData.push({
      x: [worstTuple[0], worstTuple[1]],
      value: overlaps[worstTuple[0]][worstTuple[1]],
      name: "Samen"
    })
  
  return vennData

}

function _merge_tuple_lists(tuple_list, other_tuple_list){
  const other_entries = other_tuple_list.map((e)=> {return e[0]})
  var new_tuple_list = []
  for(t of tuple_list){
    if(!other_entries.includes(t[0])){
      new_tuple_list.push([t[0], 0])
    }
    else {
      new_tuple_list.push(other_tuple_list[other_entries.indexOf(t[0])])
    }
  }
  return new_tuple_list
}

function _clean_text(str){
  return str.replace(/[^\w\s\.\:\,\;]/gi, '')
}