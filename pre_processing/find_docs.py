import requests
import json
from utils import _get_doc_paragraphs, MotionConfig
from chamber_api_utils import (
  _get_motions_metadata,
  _get_motion_text,
  _get_decision_status,
  _get_decision_votes
)
from chamber_api_utils import *

motions, next_link = _get_motions_metadata()

for motion in motions:
    motion_text = _get_motion_text(motion)
    motion_actors:list = motion.pop(f"{DOCUMENT}{ACTOR}")
    motion_cases:list = motion.pop(CASE) #remove the case file to store elsewhere
    motion_main_case = None
    for motion_case in motion_cases:
        if len(motion_case.get(DECISION)) > 0:
            motion_main_case = motion_case
            break
    with open(f"data/motions/{motion['Id']}.json", "w+") as file:
      motion.update(
          {
              "text": motion_text,
              "members": [
                  motion_actor.get(f"{ACTOR}{NAME}") for motion_actor in motion_actors
              ],
              "parties": [
                  motion_actor.get(f"{ACTOR}{PARTY}") for motion_actor in motion_actors
              ],
              "status": _get_decision_status(motion_main_case) if motion_main_case else "",
              "votes_for": _get_decision_votes(motion_main_case, voted_in_favor=True),
              "votes_against": _get_decision_votes(motion_main_case, voted_in_favor=False)
          }
      )

      file.write(json.dumps(motion, indent=2))
