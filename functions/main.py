# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`
from firebase_functions import https_fn, params
import logging
from firebase_admin import initialize_app
import json
from firebase_admin import storage, db
from algoliasearch.search_client import SearchClient

initialize_app()

ALGOLIA_API_KEY = params.SecretParam("ALGOLIA_API_KEY")
client = SearchClient.create("PD7R6XVZ97", f"{ALGOLIA_API_KEY.value}")
index = client.init_index("parties")
bucket = storage.bucket()

PARTY_MAPPER = {
    "OMTZIGT": "NSC",
    # "PVDA": "GL-PVDA",
    # "GROENLINKS": "GL-PVDA",
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
    "CU": "CHRISTENUNIE",
}

logger = logging.getLogger()
user_ref = db.reference("users")

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


@https_fn.on_call()
def load_user_queries(req: https_fn.CallableRequest) -> https_fn.Response:
    if req.auth and req.auth.uid:
        return list(user_ref.child(req.auth.uid).child("queries").get().values())


def save_user_query(query, uid):
    queries_ref = user_ref.child(uid).child("queries")
    queries_ref.push(query)


@https_fn.on_call(secrets=[ALGOLIA_API_KEY])
def search(req: https_fn.CallableRequest) -> https_fn.Response:
    # Create a new index and add a record
    save_user_query(req.data["query"], req.auth.uid)
    hits = index.search(req.data["query"])["hits"]
    hits = _post_process_hits(hits)
    motions = [hit for hit in hits if _is_motion(hit)]
    parties_that_filed_motions = [
        party for hit in hits if "parties" in hit for party in hit["parties"]
    ]
    parties_that_voted_in_motions = [
        party["ActorFractie"]
        for hit in hits
        if "votes_for" in hit
        for party in hit["votes_for"] + hit["votes_against"]
    ]
    parties_with_programs = [hit["party"] for hit in hits if "party" in hit]
    all_motion_parties = parties_that_filed_motions + parties_that_voted_in_motions
    all_active_parties = parties_that_filed_motions + parties_with_programs
    all_unique_active_parties = [
        party
        for index, party in enumerate(all_active_parties)
        if party is not None and all_active_parties.index(party) == index
    ]
    all_unique_motion_parties = [
        party
        for index, party in enumerate(all_motion_parties)
        if party is not None and all_motion_parties.index(party) == index
    ]

    # do some counts
    motion_party_occurances = [
        (party, parties_that_filed_motions.count(party))
        for party in all_unique_active_parties
    ]
    program_party_occurances = [
        (party, parties_with_programs.count(party))
        for party in all_unique_active_parties
    ]

    total_activity_party_occurances = [
        (party, motion_party_occurances[index][1] + program_party_occurances[index][1])
        for index, party in enumerate(all_unique_active_parties)
    ]
    return {
        "all_hits": hits,
        "n_hits": len(hits),
        "pics_per_party": _get_party_pics(all_unique_active_parties),
        "all_party_occurance_tuples": sorted(total_activity_party_occurances, key=lambda x: x[1], reverse=True), #tuple matching fails
        "motion_party_occurance_tuples": sorted(motion_party_occurances, key=lambda x: x[1], reverse=True),
        "program_party_occurance_tuples": sorted(program_party_occurances, key=lambda x: x[1], reverse=True),
        "party_overlaps": _get_overlapping_parties(
            motions, [party_count[0] for party_count in program_party_occurances[:8]]
        ),
        "biggest_blocking_party": _get_biggest_blocker(
            motions, all_unique_motion_parties
        ),
        "biggest_fan_party": _get_biggest_fan(motions, all_unique_motion_parties),
        "most_active_party": _get_most_active_party(motions, all_unique_motion_parties),
        "most_cooperating_parties": _get_cooperating_parties_in_motions(
            motions, all_unique_motion_parties
        )[0],
    }


def _map_party(party: str):
    if not party or "." in party:
        return None
    if party.upper() in PARTY_MAPPER:
        return PARTY_MAPPER[party.upper()]
    else:
        return party.upper()


def _is_program(hit):
    return "type" in hit and hit["type"] == "program" or "year" in hit


def _post_process_hits(hits):
    # remove all short hits
    hits = [hit for hit in hits if len(hit["text"].split()) > 6]
    for hit in hits:
        if "party" in hit:
            hit["party"] = _map_party(hit["party"])
        if "parties" in hit:
            hit["parties"] = [_map_party(party) for party in hit["parties"]]
        if "votes_for" in hit:
            for vote in hit["votes_for"]:
                vote["ActorFractie"] = _map_party(vote["ActorFractie"])
        if "votes_against" in hit:
            for vote in hit["votes_against"]:
                vote["ActorFractie"] = _map_party(vote["ActorFractie"])
    return hits


def _get_party_pics(parties):
    pics_per_party = {}
    pics = list(bucket.list_blobs())
    for party in parties:
        for pic in pics:
            if pic.name.upper().split(".")[0] == party.upper():
                party_pic = pic.public_url
                pics_per_party[party] = party_pic
    return pics_per_party


def _get_overlapping_parties(motions, parties):
    # Calculate the overlap between parties
    max_distance = len(motions) * 2
    overlaps_matrix = _fill_matrix(parties, max_distance)

    for motion in motions:
        for party_index, party in enumerate(parties):
            for other_party_index, other_party in enumerate(parties):
                agreement_distance = _get_party_agreement_distance(
                    motion, party, other_party
                )
                overlaps_matrix[party_index][other_party_index] -= agreement_distance

    # All overlaps are now between 0 and max_distance
    # The higher the number, the better the match

    # Find the best and worst matches
    return {
        "x": parties,
        "y": parties,
        "z": overlaps_matrix,
        "type": "heatmap",
        "colorscale": [[0, "#ffffff"], [1, "#8AAE92"]],
        "showscale": False,
    }


def _fill_matrix(parties, max_distance):
    return [[max_distance] * len(parties) for _ in range(len(parties))]


def _get_party_stance(motion, party):
    if party in motion["parties"]:
        return 1
    elif any(vote["ActorFractie"] == party for vote in motion["votes_for"]):
        return 0
    else:
        return -1


def _get_party_agreement_distance(motion, party_x, party_y):
    party_x_stance = _get_party_stance(motion, party_x)
    party_y_stance = _get_party_stance(motion, party_y)
    return abs(party_x_stance - party_y_stance)


def _get_cooperating_parties_in_motions(motions, parties):
    counter = {}
    for motion in motions:
        for party in motion["parties"]:
            for cooperating_party in [
                co_party for co_party in motion["parties"] if party != co_party
            ]:
                if party is None or cooperating_party is None:
                    continue
                combo = sorted([party, cooperating_party])
                first_key, second_key = combo[0], combo[1]
                counter.setdefault(first_key, {}).setdefault(second_key, 0)
                counter[first_key][second_key] += 1

    tuple_list = [
        (first_key, second_key, counter[first_key][second_key])
        for first_key in counter
        for second_key in counter[first_key]
    ]
    tuple_list.sort(key=lambda x: x[2], reverse=True)
    return tuple_list


def _count_parties_actions_in_motions(motions, parties, get_action_function):
    counter = [[party, 0] for party in parties]
    for motion in motions:
        parties_against = get_action_function(motion)
        for party in parties_against:
            for party_count in counter:
                if party_count[0] == party:
                    party_count[1] += 1
                    break

    counter.sort(key=lambda x: x[1], reverse=True)
    if len(counter) > 1 and counter[0][1] == counter[1][1]:
        counter[0][0] = f"(oa) {counter[0][0]}"
    return counter


def _get_motion_votes_for(motion):
    return [vote["ActorFractie"] for vote in motion["votes_for"]]


def _get_motion_votes_against(motion):
    return [vote["ActorFractie"] for vote in motion["votes_against"]]


def _get_motion_parties(motion):
    return motion["parties"]


def _get_most_active_party(motions, parties):
    return _count_parties_actions_in_motions(motions, parties, _get_motion_parties)[0]


def _get_biggest_blocker(motions, parties):
    return _count_parties_actions_in_motions(
        motions, parties, _get_motion_votes_against
    )[0]


def _get_biggest_fan(motions, parties):
    return _count_parties_actions_in_motions(motions, parties, _get_motion_votes_for)[0]


def _is_motion(hit):
    return "parties" in hit
