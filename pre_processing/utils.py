from firebase_admin import credentials, firestore, initialize_app

cred = credentials.Certificate(
    "/home/amg/Documents/politics-navigator-firebase-adminsdk-sqgcn-318ca699ce.json"
)
initialize_app(cred)

FIRESTORE_DB = firestore.client()
COLLECTION = FIRESTORE_DB.collection("parties")


def list_docs():
    return list(COLLECTION.list_documents())


class MotionConfig:
    def __init__(self, doc):
        self.doc = doc
        self.output_path = f"pre_processing/out/motions/{doc.get('Id').split('/')[-1]}"
        self.config = CONFIGS["MOTION"]


class PartyConfig:
    def __init__(self, party, year):
        self.party = party
        self.year = year
        self.doc = f"pre_processing/data/programs/{year}/{party}.pdf"
        self.config = CONFIGS[year][party]
        self.output_path = f"pre_processing/out/{year}/{party}.json"


CONFIGS = {
    2021: {
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
    },
}


def _clean_text(text: str):
    text = text.strip().strip("\n")
    return text


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
