import json
from chamber_api_utils import (
    _get_motions_metadata,
    _get_motion_text,
    _get_decision_status,
    _get_decision_votes,
)
from chamber_api_utils import DOCUMENT, ACTOR, CASE, DECISION, NAME, PARTY
import os


def process_motion(motion: dict, override=False):
    filename = f"../data/motions/{motion['Id']}.json"
    if override or not os.path.exists(filename):
        motion_text = _get_motion_text(motion)
        motion_actors: list = motion.pop(f"{DOCUMENT}{ACTOR}")
        motion_cases: list = motion.pop(CASE)  # remove the case file to store elsewhere
        motion_main_case = None
        for motion_case in motion_cases:
            if len(motion_case.get(DECISION)) > 0:
                motion_main_case = motion_case
                break
        with open(filename, "w+") as file:
            motion.update(
                {
                    "text": motion_text,
                    "members": [
                        motion_actor.get(f"{ACTOR}{NAME}")
                        for motion_actor in motion_actors
                    ],
                    "parties": [
                        motion_actor.get(f"{ACTOR}{PARTY}")
                        for motion_actor in motion_actors
                    ],
                    "status": _get_decision_status(motion_main_case)
                    if motion_main_case
                    else "",
                    "votes_for": _get_decision_votes(
                        motion_main_case, voted_in_favor=True
                    ),
                    "votes_against": _get_decision_votes(
                        motion_main_case, voted_in_favor=False
                    ),
                    "type": "motion",
                }
            )

            file.write(json.dumps(motion, indent=2))
    else:
        print(f"Skipping file {filename}")


override = input("Override exising motions? (y/n): ") == "y"
done = False
next_link = None
while not done:
    print("Getting page of motions")
    motions, next_link = _get_motions_metadata(page_number=3, next_link=next_link)
    for motion in motions:
        process_motion(motion, override=override)
    if not next_link:
        done = True
