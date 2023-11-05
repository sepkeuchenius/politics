import fitz
import json


class PartyConfig:
    def __init__(self, party, year):
        self.party = party
        self.year = year
        self.doc = f"pre_processing/data/programs/{year}/{party}.pdf"
        self.config = CONFIGS[year][party]
        self.output_path = f"pre_processing/out/{year}/{party}.json"


CONFIGS = {
    "2021": {
        "D66": {
            "SKIP_PAGES": 4,
            "MARGIN_SIZE": 50,
            "PAR_MARGIN": 20,
        },
        "BBB": {
            "SKIP_PAGES": 1,
            "MARGIN_SIZE": 50,
            "PAR_MARGIN": 20,
        },
        "VVD": {
            "SKIP_PAGES": 1,
            "MARGIN_SIZE": 50,
            "PAR_MARGIN": 20,
        },
    },
    "2023": {
        "VOLT": {
            "SKIP_PAGES": 5,
            "MARGIN_SIZE": 50,
            "PAR_MARGIN": 20,
        },
    },
    "MOTION": {
        "SKIP_PAGES": 0,
        "MARGIN_SIZE": 100,
        "PAR_MARGIN": 20,
    }
}

PARTY = input("Provide party you want to analyze the program of: ")
YEAR = input("Provide the year of the elecion: ")

party_config = PartyConfig(PARTY, YEAR)

DOC = fitz.open(party_config.doc)


def _get_doc_paragraphs(doc, config: PartyConfig = None):
    page_height = list(doc.pages())[0].rect.height
    pars = []

    blocks = [
        page.get_text("blocks")
        for index, page in enumerate(doc.pages())
        if index >= config.config["SKIP_PAGES"]
    ]

    for block in blocks:
        if len(block) > 4:
            if isinstance(block, list):
                par_text = ""
                last_y = 0
                for block_piece in block:
                    if block_piece[1] < config.config["MARGIN_SIZE"] or block_piece[1] > (page_height - config.config["MARGIN_SIZE"]):
                        continue
                    if len(block_piece) <= 4 or "<" in block_piece[4]:
                        continue
                    if block_piece[1] < last_y or block_piece[1] - last_y > config.config["PAR_MARGIN"]:
                        if par_text and len(par_text.split()) > 3:
                            pars.append(_clean_text(par_text))
                        par_text = block_piece[4]
                    else:
                        par_text += block_piece[4]
                    last_y = block_piece[1]
            else:
                raise ValueError("Not a list")
    return pars


pars = [
    {
        "text": par,
        "party": PARTY,
        "year": YEAR,
        "index": index,
        "type": "program"
    }
    for index, par in enumerate(_get_doc_paragraphs(DOC, config=party_config))
]


with open(party_config.output_path, "w+") as file:
    json.dump(pars, file, indent=2)


def _clean_text(text: str):
    text = text.strip().strip("\n")
    return text