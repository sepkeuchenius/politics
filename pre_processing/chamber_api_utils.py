import fitz
import requests
from urllib.parse import quote
from utils import _get_doc_paragraphs, MotionConfig
import typing

CASE = "Zaak"
DECISION = "Besluit"
TYPE = "Soort"
VOTE = "Stemming"
TEXT = "Tekst"
NAME = "Naam"
PARTY = "Fractie"
SIZE = "Grootte"
ACTOR = "Actor"
DOCUMENT = "Document"
MOTION = "Motie"
CHAMBER = "Kamer"
LEGISLATION = "Voorstel van wet"
FOR = "Voor"
AGAINST = "Tegen"

BASE_URL = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0"
CHAMBER_FILTER = f"{CHAMBER} eq 2"
MOTION_FILTER = f"Soort eq '{MOTION}' and {CHAMBER_FILTER}"
LEGISLATION_FILTER = f"Soort eq '{LEGISLATION}' and {CHAMBER_FILTER}"

ORDER_BY = "DocumentNummer desc"


def _get_motions_metadata(
    page_number=0, next_link=None
) -> typing.Tuple[typing.List[dict], str]:
    if not next_link:
        expansions = f"$expand={CASE}($expand={DECISION}($select={DECISION}{TYPE},{VOTE},{DECISION}{TEXT};$expand={VOTE}($select={ACTOR}{NAME},{ACTOR}{PARTY},{PARTY}{SIZE},{TYPE}))),{DOCUMENT}{ACTOR}($select={ACTOR}{NAME},{ACTOR}{PARTY})"
        selections = "$select=Id,Titel,Onderwerp,Datum"
        link = f"{BASE_URL}/{DOCUMENT}?$filter={quote(MOTION_FILTER)}&$orderby={quote(ORDER_BY)}&{selections}&$skip={250*page_number}&{expansions}"
    else:
        link = next_link
    docs: dict = requests.get(link).json()
    return docs.get("value"), docs.get("@odata.nextLink")


def _get_legislations_metadata(page_number=0) -> typing.Tuple[typing.List[dict], str]:
    expansions = f"$expand={CASE}($expand={CASE}{ACTOR},{DECISION}($select={DECISION}{TYPE},{VOTE},{DECISION}{TEXT};$expand={VOTE}($select={ACTOR}{NAME},{ACTOR}{PARTY},{PARTY}{SIZE},{TYPE}))),{DOCUMENT}{ACTOR}($select={ACTOR}{NAME},{ACTOR}{PARTY})"
    selections = "$select=Id,Titel,Onderwerp,Datum"
    docs: dict = requests.get(
        f"{BASE_URL}/{DOCUMENT}?$filter={quote(LEGISLATION_FILTER)}&$orderby={quote(ORDER_BY)}&{selections}&$skip={250*page_number}&{expansions}"
    ).json()
    return docs.get("value"), docs.get("@odata.nextLink")


def _get_doc_pdf(doc: dict) -> bytes:
    return requests.get(f"{BASE_URL}/{DOCUMENT}({doc.get('Id')})/resource").content


def _get_decision_votes(case: dict, voted_in_favor=True):
    return [
        vote
        for decision in case.get(DECISION)
        for vote in decision.get(VOTE)
        if vote.get(TYPE) == (FOR if voted_in_favor else AGAINST)
    ]


def _get_decision_status(case: dict) -> str:
    statuses = [decision.get(f"{DECISION}{TEXT}") for decision in case.get(DECISION)]
    if len(statuses) == 1:
        return statuses[0]
    else:
        return [status for status in statuses if status != "Ingediend"][0]


def _get_motion_text(motion) -> str:
    pdf_content = _get_doc_pdf(motion)
    pdf_document = fitz.open(stream=pdf_content)
    pars = _get_doc_paragraphs(pdf_document, config=MotionConfig(motion))
    for _split_index, par in enumerate(pars):
        if "MOTIE VAN" in par:
            # we found the split index.
            break
    motion_text = "\n".join(pars[_split_index + 1 :])
    return motion_text


# print(json.dumps(motion, indent=2))
# print(_get_motion_actors(motion))
# print(_get_motion_vote(motion))
