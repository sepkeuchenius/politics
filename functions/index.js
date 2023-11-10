const functions = require("firebase-functions");
const { getStorage } = require('firebase-admin/storage');
const algoliasearch = require("algoliasearch");
const client = algoliasearch('PD7R6XVZ97', process.env.ALGOLIA_API_KEY);
const index = client.initIndex('parties');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
app = initializeApp()

const bucket = getStorage().bucket()
exports.search  = functions.runWith({secrets:["ALGOLIA_API_KEY"]}).https.onCall(async (data, context) => {
  if(context.auth && context.auth.uid){
    _save_user_query(data.query, context.auth.uid)
  }
  return await index.search(data.query).then((res)=>{
    return _generate_parties_overview(res.hits);
  });
});

async function getUserQueries(data, context){
  if(context.auth && context.auth.uid){
    const db = getDatabase()
    const usersRef = db.ref('users');
    const queryRef =  usersRef.child(context.auth.uid).child("queries");
    return await queryRef.once("value").then((res) => {
      return Object.values(res.val())
    }).catch((err) => {
        functions.logger.log("test")
        functions.logger.error(err)
    })
  }
  else {
    return "false"
  }
}

exports.loadUserQueries  = functions.https.onCall(getUserQueries);

function _save_user_query(query, uid){
  const db = getDatabase()
  const usersRef = db.ref('users');
  usersRef.child(uid).child("queries").push(query)
}

const PARTY_MAPPER = {
  "OMTZIGT": "NSC",
  // "PVDA": "GL-PVDA",
  // "GROENLINKS": "GL-PVDA",
  "GL": "GL-PvdA",
  "BBB": "BBB",
  "VVD": "VVD",
  "PVDD": "PvdD",
  "D66": "D66",
  "VAN HAGA": "BVNL",
  "GROEP VAN HAGA": "BVNL",
  "KROL": "BVNL",
  "VAN KOOTEN-ARISSEN": "SPLINTER",
  "GÜNDOGAN": "GUNDOGAN",
  "CU": "CHRISTENUNIE"
}

function mapParty(party) {
  if (!party || party.includes(".")) {
    return null
  }
  if (Object.keys(PARTY_MAPPER).includes(party.toUpperCase())) {
    return PARTY_MAPPER[party.toUpperCase()]
  }
  else {
    return party.toUpperCase()
  }
}


function _get_unique_elements(list) {
  //filter null items and lowercase everything
  return list.filter((item, index, items) => { return item && items.indexOf(item) == index })
}


function _get_hit_parties(hits) {
  var parties = []
  for (hit of hits) {
    if (hit.party) {
      if (mapParty(hit.party)) {
        parties.push(hit.party)
      }
    }
    else if (hit.parties) {
      parties = parties.concat(hit.parties)
    }
  }
  //we now have a list of parties of all the hits, so we can calc their occurances
  var party_occurances = {}
  for (var party of parties) {
    if (!party_occurances[party]) {
      party_occurances[party] = 1
    }
    else {
      party_occurances[party] += 1
    }
  }
  //make into tuples
  var party_occurance_tuples = []
  for (party in party_occurances) {
    party_occurance_tuples.push([party, party_occurances[party]])
  }

  //sort by occurance
  party_occurance_tuples.sort((a, b) => { return b[1] - a[1] });

  //return the sorted parties
  return party_occurance_tuples;
}


function _get_all_parties(docs) {
  var parties = []
  for (doc of docs) {
    if (doc.party) {
      parties.push(doc.party)
    }
    if (doc.parties) {
      parties = parties.concat(doc.parties)
    }
    if (doc.votes_for) {
      parties = parties.concat(doc.votes_for.map((vote) => { return vote.ActorFractie }))
    }
    if (doc.votes_against) {
      parties = parties.concat(doc.votes_against.map((vote) => { return vote.ActorFractie }))
    }
  }

  return _get_unique_elements(parties)
}


async function _generate_parties_overview(hits) {
  var motionParties = []
  var motionMemberParties = []
  hits = hits.filter((hit) => { return hit.text.split(" ").length > 6 })
  for (var hit of hits) {
    if (hit.party) {
      hit.party = mapParty(hit.party)
    }
    else if (hit.parties) {
      hit.parties = _get_unique_elements(hit.parties.map((party) => { return mapParty(party) }))
      motionParties = motionParties.concat(hit.parties)
      motionMemberParties = motionMemberParties.concat(hit.parties)
    }
    if (hit.votes_for && hit.votes_for.length > 0) {
      hit.votes_for = _get_unique_elements(hit.votes_for.map((vote) => { vote.ActorFractie = mapParty(vote.ActorFractie); return vote }))
      hit.total_votes_for = hit.votes_for.map((vote) => { return vote.FractieGrootte }).reduce((total, n) => { return total + n })
      motionParties = motionParties.concat(hit.votes_for.map((vote) => { return vote.ActorFractie }))
    }
    if (hit.votes_against && hit.votes_against.length > 0) {
      hit.votes_against = _get_unique_elements(hit.votes_against.map((vote) => { vote.ActorFractie = mapParty(vote.ActorFractie); return vote }))
      hit.total_votes_against = hit.votes_against.map((vote) => { return vote.FractieGrootte }).reduce((total, n) => { return total + n })
      motionParties = motionParties.concat(hit.votes_against.map((vote) => { return vote.ActorFractie }))
    }
  }
  motionParties = _get_unique_elements(motionParties)
  var pics_per_party = {}
  var total_hits = 0
  pics = await bucket.getFiles()
  const allParties = _get_all_parties(hits)
  for (var party of allParties) {
    for (pic of pics[0]) {
      if (pic.name.toLowerCase().split(".")[0] == party.toLowerCase()) {
        party_pic = pic.publicUrl()
        pics_per_party[party] = party_pic
      }
    }
  }
  const motions = hits.filter((hit) => { return hit.members })
  const party_occurance_tuples = _get_hit_parties(hits)
  for (party_index in party_occurance_tuples) {
    var party_pic = null
    party = party_occurance_tuples[party_index][0]
    party_hits = hits.filter((hit) => { return hit.party == party || (hit.parties && hit.parties.includes(party)) })
    total_hits += party_hits.length
  }
  program_party_occurance_tuples = _merge_tuple_lists(party_occurance_tuples, _get_hit_parties(hits.filter((hit) => { return !hit.members })))
  return {
    all_hits: hits,
    pics_per_party: pics_per_party,
    n_hits: total_hits,
    all_party_occurance_tuples: party_occurance_tuples,
    motion_party_occurance_tuples: _merge_tuple_lists(party_occurance_tuples, _get_hit_parties(motions)),
    program_party_occurance_tuples: program_party_occurance_tuples,
    party_overlaps: _get_overlapping_parties(motions, program_party_occurance_tuples.slice(0,8).map((tuple)=>{return tuple[0]})),
    biggest_blocking_party: _get_biggest_blocker(motions, motionParties),
    biggest_fan_party: _get_biggest_fan(motions, motionParties),
    most_active_party: _get_most_active_party(motions, motionParties),
    most_cooperating_parties: _get_cooperating_parties_in_motions(motions, motionParties)[0],
  }
}


function _get_party_stance(motion, party) {
  if (motion.parties.includes(party)) {
    return 1
  }
  else if (motion.votes_for.map((vote) => { return vote.ActorFractie }).includes(party)) {
    return 0;
  }
  else {
    return -1
  }
}


function _get_party_agreement_distance(motion, partyX, partyY) {
  const partyXStance = _get_party_stance(motion, partyX)
  const partyYStance = _get_party_stance(motion, partyY)
  return Math.abs(partyXStance - partyYStance) // get distance
}
//samenwerking: meest gecombineerde motie indieners
//tegenwerking: meest geblokkeerde moties
//meewerking: meest geaccepteerde motie waar niet aan is megedaan
//tegenstellend: meeste afstand
//ijverig: meest ingediende moties

function _get_cooperating_parties_in_motions(motions, parties) {
  var counter = {}
  for (motion of motions) {
    for (party of motion.parties) {
      for (cooperatingParty of motion.parties.filter((coParty) => { return party != coParty })) {
        combo = [party, cooperatingParty].sort()
        firstKey = combo[0]
        secondKey = combo[1]
        if (!counter[firstKey]) {
          counter[firstKey] = {}
        }
        if (!counter[firstKey][secondKey]) {
          counter[firstKey][secondKey] = 1
        }
        else {
          counter[firstKey][secondKey] += 1
        }
      }
    }
  }
  var tuple_list = []
  for (firstKey in counter) {
    for (secondKey in counter[firstKey]) {
      tuple_list.push([firstKey, secondKey, counter[firstKey][secondKey]])
    }
  }
  tuple_list.sort((a, b) => { return b[2] - a[2] })
  return tuple_list
}


function _count_parties_actions_in_motions(motions, parties, get_action_function) {
  var counter = parties.map((party) => { return [party, 0] })
  for (motion of motions) {
    const parties_against = get_action_function(motion)
    for (party of parties_against) {
      for (party_count of counter) {
        if (party_count[0] == party) {
          party_count[1] += 1
          break
        }
      }
    }
  }
  counter.sort((a, b) => { return b[1] - a[1] });
  if (counter.length > 1 && counter[0][1] == counter[1][1]) {
    counter[0][0] = `(oa) ${counter[0][0]}`
  }
  return counter
}


function _get_motion_votes_for(motion) {
  return motion.votes_for.map((vote) => { return vote.ActorFractie })
}


function _get_motion_votes_againts(motion) {
  return motion.votes_against.map((vote) => { return vote.ActorFractie })
}


function _get_motion_parties(motion) {
  return motion.parties
}


function _get_most_active_party(motions, parties) {
  return _count_parties_actions_in_motions(motions, parties, _get_motion_parties)[0]
}

function _get_biggest_blocker(motions, parties) {
  return _count_parties_actions_in_motions(motions, parties, _get_motion_votes_againts)[0]
}

function _get_biggest_fan(motions, parties) {
  return _count_parties_actions_in_motions(motions, parties, _get_motion_votes_for)[0]
}

function _fill_matrix(participants, defaultValue) {
  var matrix = []
  for (part of participants) {
    var partList = []
    for (otherPart of participants) {
      partList.push(defaultValue)
    }
    matrix.push(partList)
  }
  return matrix
}

function _get_overlapping_parties(motions, parties) {
  //calculate the overlap between parties
  const maxDistance = motions.length * 2;
  var overlapsMatrix = _fill_matrix(parties, maxDistance)
  for (motion of motions) {
    for (const party_index in parties) {
      const party = parties[party_index]
      for (const otherParty_index in parties) {
        const otherParty = parties[otherParty_index]
        var agreementDistance = _get_party_agreement_distance(motion, party, otherParty);
        overlapsMatrix[party_index][otherParty_index] -= agreementDistance;
      }
    }
  }
  // all overlaps are now between 0 and maxDistance
  // the higher the number, the better the match

  // find best and worst matches
  return {
    "x": parties, "y": parties, "z": overlapsMatrix, 
    type: 'heatmap',
    colorscale : [
      [0, '#ffffff'],
      [1, '#8AAE92']
    ],
    showscale: false
  }
}

function _merge_tuple_lists(tuple_list, other_tuple_list) {
  const other_entries = other_tuple_list.map((e) => { return e[0] })
  var new_tuple_list = []
  for (t of tuple_list) {
    if (!other_entries.includes(t[0])) {
      new_tuple_list.push([t[0], 0])
    }
    else {
      new_tuple_list.push(other_tuple_list[other_entries.indexOf(t[0])])
    }
  }
  return new_tuple_list
}

function _clean_text(str) {
  return str.replace(/[^\w\s\.\:\,\;]/gi, '')
}