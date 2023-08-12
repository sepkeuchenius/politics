import fitz
import json
from firebase_admin import credentials, firestore, initialize_app
PARTY = "VVD"
from utils import DOCS, CONFIGS


DOC = fitz.open(DOCS[PARTY])
CONFIG = CONFIGS[PARTY]




def _clean_text(text:str):
    text = text.strip().strip("\n")
    return text


page_height = list(DOC.pages())[0].rect.height

pars = []
blocks = [page.get_text("blocks") for index, page in enumerate(DOC.pages()) if index >= CONFIG["SKIP_PAGES"]]
for block in blocks:
    if len(block) > 4:
        #check if blocks inside block
        if isinstance(block, list):
            #put blocks together
            par_text = ""
            last_y = 0
            for block_piece in block:
                if block_piece[1] < CONFIG["MARGIN_SIZE"] or block_piece[1] > (page_height - CONFIG["MARGIN_SIZE"]):
                    continue
                if len(block_piece) <= 4 or "<" in block_piece[4]:
                    continue
                if block_piece[1] < last_y or block_piece[1] - last_y > CONFIG["PAR_MARGIN"]:
                    if par_text and len(par_text.split()) > 3:
                        pars.append(_clean_text(par_text))
                    par_text = block_piece[4]
                else:
                    par_text += block_piece[4]
                last_y = block_piece[1]

        else:
            raise ValueError("Not a list")
        


with open(f"preprocessing/out/pars_{PARTY}.json", "w+") as file:
    json.dump(pars, file, indent=2)
