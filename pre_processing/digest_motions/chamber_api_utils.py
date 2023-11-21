import fitz
import requests
from urllib.parse import quote
# from ..utils import _get_doc_paragraphs
import typing


class MotionConfig:
    def __init__(self, doc):
        self.doc = doc
        self.output_path = f"../out/motions/{doc.get('Id').split('/')[-1]}"
        self.config = CONFIGS["MOTION"]


CONFIGS = {
    "MOTION": {
        "SKIP_PAGES": 0,
        "MARGIN_SIZE": 100,
        "PAR_MARGIN": 20,
    },
}


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
CHANGED_ON = "GewijzigdOp"
BASE_URL = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0"
CHAMBER_FILTER = f"{CHAMBER} eq 2"
MOTION_FILTER = f"Soort eq '{MOTION}' and {CHAMBER_FILTER}"
LEGISLATION_FILTER = f"Soort eq '{LEGISLATION}' and {CHAMBER_FILTER}"

ORDER_BY = "DocumentNummer desc"


def _get_motions_metadata(
    page_number=0, next_link=None
) -> typing.Tuple[typing.List[dict], str]:
    if not next_link:
        expansions = f"$expand={CASE}($expand={DECISION}($select={DECISION}{TYPE},{VOTE},{DECISION}{TEXT},{CHANGED_ON};$orderby={CHANGED_ON};$expand={VOTE}($select={ACTOR}{NAME},{ACTOR}{PARTY},{PARTY}{SIZE},{TYPE}))),{DOCUMENT}{ACTOR}($select={ACTOR}{NAME},{ACTOR}{PARTY})"
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
    return statuses[0]


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


def _clean_text(text: str):
    text = text.strip().strip("\n")
    return text


def _get_doc_paragraphs(doc, config: MotionConfig = None):
    page_height = list(doc.pages())[0].rect.height
    pars = []
    blocks = [
        page.get_text("blocks")
        for index, page in enumerate(doc.pages())
        if index >= config.config["SKIP_PAGES"]
    ]
    for block in blocks:
        if len(block) > 4:
            # check if blocks inside block
            if isinstance(block, list):
                # put blocks together
                par_text = ""
                last_y = 0
                for block_piece in block:
                    if block_piece[1] < config.config["MARGIN_SIZE"] or block_piece[
                        1
                    ] > (page_height - config.config["MARGIN_SIZE"]):
                        continue
                    if len(block_piece) <= 4 or "<" in block_piece[4]:
                        continue
                    if (
                        block_piece[1] < last_y
                        or block_piece[1] - last_y > config.config["PAR_MARGIN"]
                    ):
                        if par_text and len(par_text.split()) > 3:
                            pars.append(_clean_text(par_text))
                        par_text = block_piece[4]
                    else:
                        par_text += block_piece[4]
                    last_y = block_piece[1]

            else:
                raise ValueError("Not a list")
    return pars


# print(json.dumps(motion, indent=2))
# print(_get_motion_actors(motion))
# print(_get_motion_vote(motion))
